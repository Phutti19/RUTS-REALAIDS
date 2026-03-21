import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';

import { SettingsService } from './settings.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateFacultyDto } from './dto/create-faculty.dto';
import { CreateDepartmentDto } from './dto/create-department.dto';

@Controller('admin/faculties')
@UseGuards(AuthGuard, RolesGuard)
export class FacultiesController {
  constructor(private readonly settingsService: SettingsService) {}

  /** GET /api/v1/admin/faculties — list all faculties with departments (any authenticated user) */
  @Get()
  @Roles('student', 'staff', 'admin')
  async listFaculties() {
    const data = await this.settingsService.listFaculties();
    return { success: true, data };
  }

  /** POST /api/v1/admin/faculties — create faculty (admin only) */
  @Post()
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  async createFaculty(@Body() dto: CreateFacultyDto) {
    const data = await this.settingsService.createFaculty(dto);
    return { success: true, data };
  }

  /** PUT /api/v1/admin/faculties/:id — update faculty name (admin only) */
  @Put(':id')
  @Roles('admin')
  async updateFaculty(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateFacultyDto,
  ) {
    const data = await this.settingsService.updateFaculty(id, dto);
    return { success: true, data };
  }

  /** PATCH /api/v1/admin/faculties/:id/toggle — toggle active (admin only) */
  @Patch(':id/toggle')
  @Roles('admin')
  async toggleFaculty(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.settingsService.toggleFaculty(id);
    return { success: true, data };
  }

  /** DELETE /api/v1/admin/faculties/:id — delete faculty (admin only) */
  @Delete(':id')
  @Roles('admin')
  async deleteFaculty(@Param('id', ParseUUIDPipe) id: string) {
    await this.settingsService.deleteFaculty(id);
    return { success: true, message: 'Deleted' };
  }

  // ── Departments ───────────────────────────────────────────────────────────

  /** POST /api/v1/admin/faculties/departments — create department (admin only) */
  @Post('departments')
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  async createDepartment(@Body() dto: CreateDepartmentDto) {
    const data = await this.settingsService.createDepartment(dto);
    return { success: true, data };
  }

  /** PUT /api/v1/admin/faculties/departments/:id — update department name (admin only) */
  @Put('departments/:id')
  @Roles('admin')
  async updateDepartment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('name') name: string,
  ) {
    const data = await this.settingsService.updateDepartment(id, name);
    return { success: true, data };
  }

  /** PATCH /api/v1/admin/faculties/departments/:id/toggle — toggle active (admin only) */
  @Patch('departments/:id/toggle')
  @Roles('admin')
  async toggleDepartment(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.settingsService.toggleDepartment(id);
    return { success: true, data };
  }

  /** DELETE /api/v1/admin/faculties/departments/:id — delete department (admin only) */
  @Delete('departments/:id')
  @Roles('admin')
  async deleteDepartment(@Param('id', ParseUUIDPipe) id: string) {
    await this.settingsService.deleteDepartment(id);
    return { success: true, message: 'Deleted' };
  }
}
