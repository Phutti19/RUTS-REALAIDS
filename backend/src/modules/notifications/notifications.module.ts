import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { PushSubscriptionsController } from './push-subscriptions.controller';
import { NotificationsService } from './notifications.service';

@Module({
  controllers: [NotificationsController, PushSubscriptionsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
