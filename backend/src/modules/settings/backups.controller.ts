import {
  Controller,
  Get,
  Post,
  Param,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

import { SettingsService } from './settings.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('backups')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin')
export class BackupsController {
  constructor(private readonly settingsService: SettingsService) {}

  /**
   * GET /api/v1/backups
   * List all backup records in descending order.
   */
  @Get()
  async listBackups() {
    const data = await this.settingsService.listBackups();
    return { success: true, data };
  }

  /**
   * GET /api/v1/backups/:id/download
   * Stream a completed backup file as an octet-stream download.
   * Declared as a sub-path of :id to avoid NestJS route collisions.
   */
  @Get(':id/download')
  async downloadBackup(@Param('id') id: string, @Res() res: Response) {
    const { filename, buffer } = await this.settingsService.downloadBackup(id);
    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(buffer.length),
    });
    res.end(buffer);
  }

  /**
   * POST /api/v1/backups
   * Trigger a new pg_dump backup. Requires pg_dump in the system PATH.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createBackup(@CurrentUser('id') userId: string) {
    const data = await this.settingsService.createBackup(userId);
    return { success: true, data };
  }
}
