import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';

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
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly ws: WsService,
  ) {}

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
      `UPDATE notifications SET is_read = true WHERE id = $1 RETURNING *`,
      [id],
    );
    return this.formatNotification(updated!);
  }

  async markAllAsRead(userId: string): Promise<{ updated: number }> {
    const count = await this.db.execute(
      `UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false`,
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
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh_key, auth_key)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (endpoint) DO UPDATE
         SET user_id     = EXCLUDED.user_id,
             p256dh_key  = EXCLUDED.p256dh_key,
             auth_key    = EXCLUDED.auth_key
       RETURNING *`,
      [userId, dto.endpoint, dto.p256dh, dto.auth],
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
