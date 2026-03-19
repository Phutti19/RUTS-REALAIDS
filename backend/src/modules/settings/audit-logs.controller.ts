import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { SettingsService } from './settings.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ListAuditLogsDto } from './dto/list-audit-logs.dto';

@Controller('admin/audit-logs')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin')
export class AuditLogsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  async listAuditLogs(@Query() query: ListAuditLogsDto) {
    const result = await this.settingsService.listAuditLogs(query);
    return { success: true, ...result };
  }
}
