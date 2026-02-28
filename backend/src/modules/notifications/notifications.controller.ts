import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';

import { NotificationsService } from './notifications.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ListNotificationsDto } from './dto/list-notifications.dto';

@Controller('notifications')
@UseGuards(AuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // ── Static routes — MUST come before :id ──────────────────────────────────────

  /**
   * GET /api/v1/notifications/unread-count
   * Returns { count: number } for the current user's unread notifications.
   */
  @Get('unread-count')
  async getUnreadCount(@CurrentUser('id') userId: string) {
    const data = await this.notificationsService.getUnreadCount(userId);
    return { success: true, data };
  }

  /**
   * PATCH /api/v1/notifications/read-all
   * Marks every unread notification for the current user as read.
   * Returns { updated: number }.
   */
  @Patch('read-all')
  async markAllAsRead(@CurrentUser('id') userId: string) {
    const data = await this.notificationsService.markAllAsRead(userId);
    return { success: true, data };
  }

  // ── Paginated list ────────────────────────────────────────────────────────────

  /**
   * GET /api/v1/notifications
   * Paginated list of the current user's notifications, newest first.
   * Query params: page, limit, type, isRead
   */
  @Get()
  async listNotifications(
    @CurrentUser('id') userId: string,
    @Query() query: ListNotificationsDto,
  ) {
    const result = await this.notificationsService.listNotifications(userId, query);
    return {
      success: true,
      data: result.data,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  // ── Per-notification actions ──────────────────────────────────────────────────

  /**
   * PATCH /api/v1/notifications/:id/read
   * Mark a specific notification as read. Only the owner can mark it.
   */
  @Patch(':id/read')
  async markAsRead(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.notificationsService.markAsRead(id, userId);
    return { success: true, data };
  }

  /**
   * DELETE /api/v1/notifications/:id
   * Permanently delete one notification. Only the owner can delete it.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteNotification(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.notificationsService.deleteNotification(id, userId);
  }
}
