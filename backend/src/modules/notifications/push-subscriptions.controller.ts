import {
  Controller,
  Post,
  Delete,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';

import { NotificationsService } from './notifications.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SubscribePushDto } from './dto/subscribe-push.dto';

@Controller('push-subscriptions')
@UseGuards(AuthGuard)
export class PushSubscriptionsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * POST /api/v1/push-subscriptions
   * Register (or update) a Web Push subscription for the current user.
   *
   * Body: { endpoint: string, p256dh: string, auth: string }
   * Upserts on endpoint — safe to call on every service worker registration.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async subscribe(
    @CurrentUser('id') userId: string,
    @Body() dto: SubscribePushDto,
  ) {
    const data = await this.notificationsService.subscribe(userId, dto);
    return { success: true, data };
  }

  /**
   * DELETE /api/v1/push-subscriptions
   * Remove a push subscription.
   *
   * Optional query param ?endpoint=<url>
   *   - If provided: removes only that specific subscription (one device).
   *   - If omitted:  removes ALL subscriptions for this user (sign-out scenario).
   */
  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async unsubscribe(
    @CurrentUser('id') userId: string,
    @Query('endpoint') endpoint?: string,
  ) {
    await this.notificationsService.unsubscribe(userId, endpoint);
  }
}
