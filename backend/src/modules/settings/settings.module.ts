import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { AdminUsersController } from './admin-users.controller';
import { BackupsController } from './backups.controller';
import { EmergencyContactsController } from './emergency-contacts.controller';
import { AuditLogsController } from './audit-logs.controller';
import { TreatmentTypesController } from './treatment-types.controller';
import { FacultiesController } from './faculties.controller';
import { LoginAttemptsController } from './login-attempts.controller';
import { BroadcastController } from './broadcast.controller';
import { SettingsService } from './settings.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [
    SettingsController,
    AdminUsersController,
    BackupsController,
    EmergencyContactsController,
    AuditLogsController,
    TreatmentTypesController,
    FacultiesController,
    LoginAttemptsController,
    BroadcastController,
  ],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
