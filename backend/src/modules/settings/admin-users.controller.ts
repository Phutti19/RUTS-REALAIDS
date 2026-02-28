import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';

import { SettingsService } from './settings.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ListAdminUsersDto } from './dto/list-admin-users.dto';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';

@Controller('admin/users')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin')
export class AdminUsersController {
  constructor(private readonly settingsService: SettingsService) {}

  /**
   * GET /api/v1/admin/users
   * List all users with pagination and optional role/search filter.
   */
  @Get()
  async listUsers(@Query() query: ListAdminUsersDto) {
    const result = await this.settingsService.listUsers(query);
    return { success: true, ...result };
  }

  /**
   * POST /api/v1/admin/users
   * Create a new staff or admin user account.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createUser(@Body() dto: CreateAdminUserDto) {
    const data = await this.settingsService.createUser(dto);
    return { success: true, data };
  }

  /**
   * PUT /api/v1/admin/users/:id
   * Update user profile fields (email, name, phone, role).
   */
  @Put(':id')
  async updateUser(@Param('id') id: string, @Body() dto: UpdateAdminUserDto) {
    const data = await this.settingsService.updateUser(id, dto);
    return { success: true, data };
  }

  /**
   * PATCH /api/v1/admin/users/:id/deactivate
   * Set is_active = false. Declared before :id/activate to ensure correct matching.
   */
  @Patch(':id/deactivate')
  async deactivateUser(@Param('id') id: string) {
    const data = await this.settingsService.deactivateUser(id);
    return { success: true, data };
  }

  /**
   * PATCH /api/v1/admin/users/:id/activate
   * Set is_active = true.
   */
  @Patch(':id/activate')
  async activateUser(@Param('id') id: string) {
    const data = await this.settingsService.activateUser(id);
    return { success: true, data };
  }
}
