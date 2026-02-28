import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { AdminUsersController } from './admin-users.controller';
import { BackupsController } from './backups.controller';
import { EmergencyContactsController } from './emergency-contacts.controller';
import { SettingsService } from './settings.service';

@Module({
  controllers: [
    SettingsController,
    AdminUsersController,
    BackupsController,
    EmergencyContactsController,
  ],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
