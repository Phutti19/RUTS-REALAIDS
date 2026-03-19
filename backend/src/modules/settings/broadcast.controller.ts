import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';

import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { BroadcastNotificationDto } from './dto/broadcast-notification.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { DatabaseService } from '../../database/db.service';

@Controller('admin/broadcast')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin')
export class BroadcastController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly db: DatabaseService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async broadcast(@Body() dto: BroadcastNotificationDto) {
    if (dto.target === 'staff' || dto.target === 'all') {
      await this.notificationsService.notifyAllStaff(
        'system',
        dto.title,
        dto.message,
      );
    }

    if (dto.target === 'student' || dto.target === 'all') {
      // Notify all active students
      await this.db.execute(
        `INSERT INTO notifications (user_id, type, title, message)
         SELECT id, 'system'::notification_type, $1, $2
         FROM users
         WHERE role = 'student' AND is_active = true`,
        [dto.title, dto.message],
      );
    }

    return { success: true, message: 'Broadcast sent successfully' };
  }

  @Get('stats')
  async getPushStats() {
    const row = await this.db.queryOne<{ total: string; staff: string; student: string }>(
      `SELECT
         COUNT(*)::text AS total,
         COUNT(*) FILTER (WHERE u.role IN ('staff', 'admin'))::text AS staff,
         COUNT(*) FILTER (WHERE u.role = 'student')::text AS student
       FROM push_subscriptions ps
       JOIN users u ON u.id = ps.user_id
       WHERE u.is_active = true`,
    );
    return {
      success: true,
      data: {
        total: parseInt(row?.total ?? '0', 10),
        staff: parseInt(row?.staff ?? '0', 10),
        student: parseInt(row?.student ?? '0', 10),
      },
    };
  }
}
