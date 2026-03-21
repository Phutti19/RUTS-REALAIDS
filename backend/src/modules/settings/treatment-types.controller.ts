import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';

import { SettingsService } from './settings.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateTreatmentTypeDto } from './dto/create-treatment-type.dto';

@Controller('admin/treatment-types')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin')
export class TreatmentTypesController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  async listTreatmentTypes() {
    const data = await this.settingsService.listTreatmentTypes();
    return { success: true, data };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createTreatmentType(@Body() dto: CreateTreatmentTypeDto) {
    const data = await this.settingsService.createTreatmentType(dto);
    return { success: true, data };
  }

  @Patch(':id/toggle')
  async toggleTreatmentType(@Param('id') id: string) {
    const data = await this.settingsService.toggleTreatmentType(id);
    return { success: true, data };
  }

  @Delete(':id')
  async deleteTreatmentType(@Param('id') id: string) {
    await this.settingsService.deleteTreatmentType(id);
    return { success: true, message: 'Deleted' };
  }
}
