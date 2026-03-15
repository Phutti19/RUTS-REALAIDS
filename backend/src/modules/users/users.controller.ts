import {
  Controller,
  Get,
  Put,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';

import { UsersService } from './users.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateHealthProfileDto } from './dto/update-health-profile.dto';
import { UpdatePatientProfileDto } from './dto/update-patient-profile.dto';
import { ListUsersDto } from './dto/list-users.dto';

@Controller('users')
@UseGuards(AuthGuard) // All users routes require authentication
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ── Current user: /me routes ────────────────────────────────────────────────

  /**
   * GET /api/v1/users/me
   * Returns the authenticated user's profile.
   * Available to: all roles (student, staff, admin)
   */
  @Get('me')
  async getMe(@CurrentUser('id') userId: string) {
    const data = await this.usersService.getMe(userId);
    return { success: true, data };
  }

  /**
   * PUT /api/v1/users/me
   * Update own profile (firstName, lastName, phone).
   * Email and role cannot be changed here.
   */
  @Put('me')
  @HttpCode(HttpStatus.OK)
  async updateMe(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    const data = await this.usersService.updateMe(userId, dto);
    return { success: true, data };
  }

  /**
   * GET /api/v1/users/me/health-profile
   * Returns the authenticated user's health profile.
   * Returns an empty profile object if none has been set yet.
   */
  @Get('me/health-profile')
  async getHealthProfile(@CurrentUser('id') userId: string) {
    const data = await this.usersService.getHealthProfile(userId);
    return { success: true, data };
  }

  /**
   * PUT /api/v1/users/me/health-profile
   * Create or update own health profile (upsert).
   * Fields are optional — only provided fields are updated.
   */
  @Put('me/health-profile')
  @HttpCode(HttpStatus.OK)
  async updateHealthProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateHealthProfileDto,
  ) {
    const data = await this.usersService.updateHealthProfile(userId, dto);
    return { success: true, data };
  }

  // ── Staff: list & detail ────────────────────────────────────────────────────

  /**
   * GET /api/v1/users
   * Paginated user list with optional filters.
   * Available to: staff, admin only
   *
   * Query params:
   *   page, limit, role, isActive, search, sortBy, order
   */
  @Get()
  @UseGuards(RolesGuard)
  @Roles('staff', 'admin')
  async listUsers(@Query() query: ListUsersDto) {
    const result = await this.usersService.listUsers(query);
    return {
      success: true,
      data: result.data,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  /**
   * GET /api/v1/users/:id/health-profile
   * Get health profile for a specific user by UUID.
   * Available to: staff, admin only
   * MUST be defined before :id route to avoid path conflict.
   */
  @Get(':id/health-profile')
  @UseGuards(RolesGuard)
  @Roles('staff', 'admin')
  async getHealthProfileById(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.usersService.getHealthProfile(id);
    return { success: true, data };
  }

  /**
   * PUT /api/v1/users/:id/health-profile
   * Staff updates a patient's health profile (blood type, allergies, etc.)
   * Available to: staff, admin only
   */
  @Put(':id/health-profile')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles('staff', 'admin')
  async updateHealthProfileById(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateHealthProfileDto,
  ) {
    const data = await this.usersService.updateHealthProfile(id, dto);
    return { success: true, data };
  }

  /**
   * GET /api/v1/users/:id
   * Get a specific user's profile by UUID.
   * Available to: staff, admin only
   */
  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('staff', 'admin')
  async getUserById(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.usersService.getUserById(id);
    return { success: true, data };
  }

  /**
   * PATCH /api/v1/users/:id
   * Staff updates a patient's demographic info (national_id, title, birth_date,
   * department, year_of_study, position, phone) collected at intake time.
   * Available to: staff, admin only
   */
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles('staff', 'admin')
  async updatePatientProfile(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePatientProfileDto,
  ) {
    const data = await this.usersService.updatePatientProfile(id, dto);
    return { success: true, data };
  }
}
