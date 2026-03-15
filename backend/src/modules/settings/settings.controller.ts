import { Controller, Get, Put, Param, Body, UseGuards } from '@nestjs/common';

import { SettingsService } from './settings.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UpdateSettingDto } from './dto/update-setting.dto';

@Controller('settings')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  /**
   * GET /api/v1/settings
   * Returns all system settings (key/value pairs).
   */
  @Get()
  async getAllSettings() {
    const data = await this.settingsService.getAllSettings();
    return { success: true, data };
  }

  /**
   * GET /api/v1/settings/infirmary
   * Returns infirmary info (name, lat, lng, phone).
   * Declared BEFORE :key to avoid route collision.
   * Accessible by both staff and admin (used on emergency map).
   */
  @Get('infirmary')
  @Roles('staff', 'admin')
  async getInfirmaryInfo() {
    const data = await this.settingsService.getInfirmaryInfo();
    return { success: true, data };
  }

  /**
   * PUT /api/v1/settings/:key
   * Update a single setting. Records which admin made the change.
   */
  @Put(':key')
  async updateSetting(
    @Param('key') key: string,
    @Body() dto: UpdateSettingDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.settingsService.updateSetting(key, dto, userId);
    return { success: true, data };
  }
}
