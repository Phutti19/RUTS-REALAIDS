import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { SettingsService } from './settings.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ListLoginAttemptsDto } from './dto/list-login-attempts.dto';

@Controller('admin/login-attempts')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin')
export class LoginAttemptsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  async listLoginAttempts(@Query() query: ListLoginAttemptsDto) {
    const result = await this.settingsService.listLoginAttempts(query);
    return { success: true, ...result };
  }

  @Get('stats')
  async getStats() {
    const data = await this.settingsService.getLoginAttemptStats();
    return { success: true, data };
  }
}
