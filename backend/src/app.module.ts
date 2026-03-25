import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';

import { AppController } from './app.controller';
import { AppService } from './app.service';

// ── Core infrastructure ──
import { DatabaseModule } from './database/db.module';
import { WsModule } from './websocket/ws.module';

// ── Feature modules ──
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { EmergencyModule } from './modules/emergency/emergency.module';
import { VisitsModule } from './modules/visits/visits.module';
import { MedicinesModule } from './modules/medicines/medicines.module';
import { CertificatesModule } from './modules/certificates/certificates.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ReportsModule } from './modules/reports/reports.module';
import { SettingsModule } from './modules/settings/settings.module';

@Module({
  imports: [
    // ConfigModule — load .env globally
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Rate limiting — 20 requests per 60 seconds per IP (global default)
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 20 }]),

    // Core infrastructure
    ScheduleModule.forRoot(),
    DatabaseModule,
    WsModule,

    // Feature modules
    AuthModule,
    UsersModule,
    EmergencyModule,
    VisitsModule,
    MedicinesModule,
    CertificatesModule,
    AppointmentsModule,
    NotificationsModule,
    ReportsModule,
    SettingsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
