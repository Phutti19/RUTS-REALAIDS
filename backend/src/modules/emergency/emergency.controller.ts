import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';

import { EmergencyService } from './emergency.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { AddImageDto } from './dto/add-image.dto';
import { ListIncidentsDto } from './dto/list-incidents.dto';

@Controller('incidents')
@UseGuards(AuthGuard) // All incident routes require authentication
export class EmergencyController {
  constructor(private readonly emergencyService: EmergencyService) {}

  // ── Create ───────────────────────────────────────────────────────────────────

  /**
   * POST /api/v1/incidents
   * Report a new emergency incident.
   * Available to: all authenticated users (students report incidents)
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createIncident(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateIncidentDto,
  ) {
    const data = await this.emergencyService.createIncident(userId, dto);
    return { success: true, data };
  }

  // ── List ─────────────────────────────────────────────────────────────────────

  /**
   * GET /api/v1/incidents
   * Paginated incident list with optional filters.
   * - Staff/admin: see all incidents
   * - Students: see only their own incidents
   *
   * Query params: page, limit, status, incidentType, severity, from, to,
   *               reporterId (staff only), search, sortBy, order
   */
  @Get()
  async listIncidents(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Query() query: ListIncidentsDto,
  ) {
    const result = await this.emergencyService.listIncidents(query, userId, role);
    return {
      success: true,
      data: result.data,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  // ── Detail ───────────────────────────────────────────────────────────────────

  /**
   * GET /api/v1/incidents/:id
   * Get full incident details including reporter, responder, and images.
   * - Staff/admin: any incident
   * - Students: own incidents only (403 otherwise)
   */
  @Get(':id')
  async getIncidentById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    const data = await this.emergencyService.getIncidentById(id, userId, role);
    return { success: true, data };
  }

  // ── Accept ───────────────────────────────────────────────────────────────────

  /**
   * POST /api/v1/incidents/:id/accept
   * Staff accepts a pending incident (becomes responder).
   * Transitions status: pending → accepted
   * Available to: staff, admin only
   */
  @Post(':id/accept')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles('staff', 'admin')
  async acceptIncident(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') staffId: string,
  ) {
    const data = await this.emergencyService.acceptIncident(id, staffId);
    return { success: true, data };
  }

  // ── Update status ─────────────────────────────────────────────────────────────

  /**
   * PATCH /api/v1/incidents/:id/status
   * Update incident status.
   * Valid transitions:
   *   pending     → in_progress | cancelled
   *   accepted    → in_progress | completed | cancelled
   *   in_progress → completed   | cancelled
   * Available to: staff, admin only
   */
  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles('staff', 'admin')
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') staffId: string,
    @Body() dto: UpdateStatusDto,
  ) {
    const data = await this.emergencyService.updateStatus(id, staffId, dto);
    return { success: true, data };
  }

  // ── Images ───────────────────────────────────────────────────────────────────

  /**
   * POST /api/v1/incidents/:id/images
   * Add an image URL to an incident.
   * Body: { imageUrl: string }  — frontend uploads to storage first, then sends URL
   * - Students: own incidents only
   * - Staff/admin: any incident
   */
  @Post(':id/images')
  @HttpCode(HttpStatus.CREATED)
  async addImage(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Body() dto: AddImageDto,
  ) {
    const data = await this.emergencyService.addImage(id, userId, role, dto);
    return { success: true, data };
  }

  /**
   * GET /api/v1/incidents/:id/images
   * List all images for an incident.
   * Available to: all authenticated users
   */
  @Get(':id/images')
  async getImages(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.emergencyService.getImages(id);
    return { success: true, data };
  }

  // ── Status logs ───────────────────────────────────────────────────────────────

  /**
   * GET /api/v1/incidents/:id/logs
   * Full status change history for an incident.
   * - Students: own incidents only
   * - Staff/admin: any incident
   */
  @Get(':id/logs')
  async getStatusLogs(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    const data = await this.emergencyService.getStatusLogs(id, userId, role);
    return { success: true, data };
  }
}
