import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import * as webpush from 'web-push';

import { DatabaseService, PaginatedResult } from '../../database/db.service';
import { WsService, WS_EVENTS } from '../../websocket/ws.service';
import { ListNotificationsDto } from './dto/list-notifications.dto';
import { SubscribePushDto } from './dto/subscribe-push.dto';
import {
  NotificationRow,
  PushSubscriptionRow,
  Notification,
  UnreadCount,
  PushSubscriptionInfo,
  CreateNotificationInput,
} from './interfaces/notifications.interfaces';

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);
  private pushEnabled = false;

  constructor(
    private readonly db: DatabaseService,
    private readonly ws: WsService,
  ) {}

  onModuleInit() {
    const subject = process.env.VAPID_SUBJECT;
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;

    if (subject && publicKey && privateKey) {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      this.pushEnabled = true;
      this.logger.log('Web Push configured with VAPID keys');
    } else {
      this.logger.warn('VAPID keys not set — Web Push disabled');
    }
  }

  // ── Public API — called by other modules ──────────────────────────────────────

  /**
   * Create a notification for a single user and send a real-time WS event.
   * Safe to call from any module (WsModule is global).
   */
  async createNotification(input: CreateNotificationInput): Promise<Notification> {
    const row = await this.db.queryOne<NotificationRow>(
      `INSERT INTO notifications
         (user_id, type, title, message, reference_type, reference_id)
       VALUES ($1, $2::notification_type, $3, $4, $5, $6)
       RETURNING *`,
      [
        input.userId,
        input.type,
        input.title,
        input.message,
        input.referenceType ?? null,
        input.referenceId ?? null,
      ],
    );

    const notification = this.formatNotification(row!);

    // Send real-time event to the target user
    this.ws.notifyUser(input.userId, notification);

    // Send Web Push notification
    this.sendPushToUser(input.userId, {
      title: input.title,
      message: input.message,
      tag: `${input.type}-${row!.id}`,
      url: this.buildNotificationUrl(input.type, input.referenceType, input.referenceId),
    });

    return notification;
  }

  /**
   * Bulk-create a notification for every active staff/admin user.
   * Uses a single INSERT … SELECT for efficiency, then WS-broadcasts to all connected staff.
   */
  async notifyAllStaff(
    type: string,
    title: string,
    message: string,
    referenceType?: string | null,
    referenceId?: string | null,
  ): Promise<void> {
    await this.db.execute(
      `INSERT INTO notifications (user_id, type, title, message, reference_type, reference_id)
       SELECT id, $1::notification_type, $2, $3, $4, $5
       FROM users
       WHERE role IN ('staff', 'admin') AND is_active = true`,
      [type, title, message, referenceType ?? null, referenceId ?? null],
    );

    // WS broadcast to all currently-connected staff/admin
    this.ws.broadcastToStaff(WS_EVENTS.NOTIFICATION_NEW, {
      type,
      title,
      message,
      referenceType: referenceType ?? null,
      referenceId: referenceId ?? null,
    });

    // Send Web Push to all staff
    this.sendPushToStaff({
      title,
      message,
      tag: `staff-${type}`,
      url: this.buildNotificationUrl(type, referenceType, referenceId),
    });

    this.logger.log(`Broadcast notification to all staff: type=${type} title="${title}"`);
  }

  // ── Notifications CRUD ────────────────────────────────────────────────────────

  async listNotifications(
    userId: string,
    dto: ListNotificationsDto,
  ): Promise<PaginatedResult<Notification>> {
    const conditions: string[] = [`n.user_id = $1`];
    const values: unknown[] = [userId];
    let idx = 2;

    if (dto.type) {
      conditions.push(`n.type = $${idx++}::notification_type`);
      values.push(dto.type);
    }
    if (dto.isRead !== undefined) {
      conditions.push(`n.is_read = $${idx++}`);
      values.push(dto.isRead);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const countSql = `SELECT COUNT(*) FROM notifications n ${where}`;
    const dataSql  = `SELECT n.* FROM notifications n ${where} ORDER BY n.created_at DESC`;

    const result = await this.db.queryPaginated<NotificationRow>(
      countSql,
      dataSql,
      values,
      { page: dto.page, limit: dto.limit },
    );

    return {
      ...result,
      data: result.data.map((row) => this.formatNotification(row)),
    };
  }

  async getUnreadCount(userId: string): Promise<UnreadCount> {
    const row = await this.db.queryOne<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM notifications WHERE user_id = $1 AND is_read = false`,
      [userId],
    );
    return { count: parseInt(row?.count ?? '0', 10) };
  }

  async markAsRead(id: string, userId: string): Promise<Notification> {
    const existing = await this.db.queryOne<NotificationRow>(
      `SELECT * FROM notifications WHERE id = $1`,
      [id],
    );
    if (!existing) throw new NotFoundException(`Notification '${id}' not found.`);
    if (existing.user_id !== userId) throw new ForbiddenException('Access denied.');

    const updated = await this.db.queryOne<NotificationRow>(
      `UPDATE notifications SET is_read = true, read_at = NOW() WHERE id = $1 RETURNING *`,
      [id],
    );
    return this.formatNotification(updated!);
  }

  async markAllAsRead(userId: string): Promise<{ updated: number }> {
    const count = await this.db.execute(
      `UPDATE notifications SET is_read = true, read_at = NOW() WHERE user_id = $1 AND is_read = false`,
      [userId],
    );
    return { updated: count };
  }

  async deleteNotification(id: string, userId: string): Promise<void> {
    const existing = await this.db.queryOne<{ id: string; user_id: string }>(
      `SELECT id, user_id FROM notifications WHERE id = $1`,
      [id],
    );
    if (!existing) throw new NotFoundException(`Notification '${id}' not found.`);
    if (existing.user_id !== userId) throw new ForbiddenException('Access denied.');

    await this.db.execute(`DELETE FROM notifications WHERE id = $1`, [id]);
  }

  // ── Push subscriptions ────────────────────────────────────────────────────────

  /**
   * Register or update a Web Push subscription for the current user.
   * Upserts on endpoint (unique per browser tab/device).
   */
  async subscribe(userId: string, dto: SubscribePushDto): Promise<PushSubscriptionInfo> {
    const row = await this.db.queryOne<PushSubscriptionRow>(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh_key, auth_key, device_info, is_active)
       VALUES ($1, $2, $3, $4, $5, true)
       ON CONFLICT (endpoint) DO UPDATE
         SET user_id     = EXCLUDED.user_id,
             p256dh_key  = EXCLUDED.p256dh_key,
             auth_key    = EXCLUDED.auth_key,
             device_info = EXCLUDED.device_info,
             is_active   = true
       RETURNING *`,
      [userId, dto.endpoint, dto.p256dh, dto.auth, dto.deviceInfo ?? null],
    );

    this.logger.log(`Push subscription saved: user=${userId}`);
    return this.formatPushSubscription(row!);
  }

  /**
   * Remove a specific push subscription by endpoint URL.
   * If endpoint is omitted, removes ALL subscriptions for this user.
   */
  async unsubscribe(userId: string, endpoint?: string): Promise<{ removed: number }> {
    let count: number;
    if (endpoint) {
      count = await this.db.execute(
        `DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2`,
        [userId, endpoint],
      );
    } else {
      count = await this.db.execute(
        `DELETE FROM push_subscriptions WHERE user_id = $1`,
        [userId],
      );
    }

    this.logger.log(`Push subscription removed: user=${userId} count=${count}`);
    return { removed: count };
  }

  // ── Web Push delivery ────────────────────────────────────────────────────────

  private async sendPushToUser(
    userId: string,
    payload: { title: string; message: string; tag?: string; url?: string },
  ): Promise<void> {
    if (!this.pushEnabled) return;

    const subs = await this.db.queryMany<PushSubscriptionRow>(
      `SELECT * FROM push_subscriptions WHERE user_id = $1`,
      [userId],
    );
    if (!subs.length) return;

    await this.deliverPush(subs, payload);
  }

  private async sendPushToStaff(
    payload: { title: string; message: string; tag?: string; url?: string },
  ): Promise<void> {
    if (!this.pushEnabled) return;

    const subs = await this.db.queryMany<PushSubscriptionRow>(
      `SELECT ps.* FROM push_subscriptions ps
       JOIN users u ON u.id = ps.user_id
       WHERE u.role IN ('staff', 'admin') AND u.is_active = true`,
      [],
    );
    if (!subs.length) return;

    await this.deliverPush(subs, payload);
  }

  private async deliverPush(
    subscriptions: PushSubscriptionRow[],
    payload: { title: string; message: string; tag?: string; url?: string },
  ): Promise<void> {
    const body = JSON.stringify(payload);

    const results = await Promise.allSettled(
      subscriptions.map((sub) =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh_key, auth: sub.auth_key },
          },
          body,
        ),
      ),
    );

    // Clean up expired/invalid subscriptions (410 Gone or 404)
    const staleEndpoints: string[] = [];
    results.forEach((result, i) => {
      if (result.status === 'rejected') {
        const statusCode = (result.reason as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          staleEndpoints.push(subscriptions[i].endpoint);
        } else {
          this.logger.warn(
            `Push failed for endpoint ${subscriptions[i].endpoint}: ${result.reason}`,
          );
        }
      }
    });

    if (staleEndpoints.length) {
      await this.db.execute(
        `DELETE FROM push_subscriptions WHERE endpoint = ANY($1::text[])`,
        [staleEndpoints],
      );
      this.logger.log(`Removed ${staleEndpoints.length} stale push subscription(s)`);
    }
  }

  private buildNotificationUrl(
    type?: string | null,
    referenceType?: string | null,
    referenceId?: string | null,
  ): string {
    if (referenceType === 'incident' && referenceId) return `/staff/emergency`;
    if (referenceType === 'appointment' && referenceId) return `/staff/appointments`;
    if (referenceType === 'visit' && referenceId) return `/staff/patients/${referenceId}`;
    if (referenceType === 'medicine' && referenceId) return `/staff/medicines/${referenceId}`;
    if (type === 'stock_alert' || type === 'expiry_alert') return `/staff/medicines`;
    return '/';
  }

  // ── Formatters ────────────────────────────────────────────────────────────────

  private formatNotification(row: NotificationRow): Notification {
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type,
      title: row.title,
      message: row.message,
      referenceType: row.reference_type,
      referenceId: row.reference_id,
      isRead: row.is_read,
      readAt: row.read_at,
      createdAt: row.created_at,
    };
  }

  private formatPushSubscription(row: PushSubscriptionRow): PushSubscriptionInfo {
    return {
      id: row.id,
      userId: row.user_id,
      endpoint: row.endpoint,
      createdAt: row.created_at,
    };
  }
}
