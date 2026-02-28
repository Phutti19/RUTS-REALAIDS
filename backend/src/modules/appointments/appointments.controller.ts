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

import { AppointmentsService } from './appointments.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { ListAppointmentsDto } from './dto/list-appointments.dto';
import { CancelAppointmentDto } from './dto/cancel-appointment.dto';

@Controller('appointments')
@UseGuards(AuthGuard)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  // ── Static sub-routes — MUST be before :id ────────────────────────────────────

  /**
   * GET /api/v1/appointments/my
   * The calling student's own appointments (paginated).
   * Query params: page, limit, date, status, sortBy, order
   */
  @Get('my')
  async getMyAppointments(
    @CurrentUser('id') patientId: string,
    @Query() query: ListAppointmentsDto,
  ) {
    const result = await this.appointmentsService.getMyAppointments(patientId, query);
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
   * GET /api/v1/appointments/today
   * All appointments for today, ordered by time.
   * Staff/admin only.
   */
  @Get('today')
  @UseGuards(RolesGuard)
  @Roles('staff', 'admin')
  async getTodayAppointments() {
    const data = await this.appointmentsService.getTodayAppointments();
    return { success: true, data };
  }

  // ── Core CRUD ─────────────────────────────────────────────────────────────────

  /**
   * POST /api/v1/appointments
   * Book a new appointment. Any authenticated user can book (typically students).
   * Validates: slot active + date matches day_of_week + capacity + no duplicate.
   * Creates a DB notification + real-time WS event for the assigned staff.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createAppointment(
    @CurrentUser('id') patientId: string,
    @Body() dto: CreateAppointmentDto,
  ) {
    const data = await this.appointmentsService.createAppointment(patientId, dto);
    return { success: true, data };
  }

  /**
   * GET /api/v1/appointments
   * Paginated list. Staff see all; students see only their own.
   * Query params: page, limit, date, status, patientId, staffId, sortBy, order
   */
  @Get()
  async listAppointments(
    @CurrentUser('id') callerId: string,
    @CurrentUser('role') callerRole: string,
    @Query() query: ListAppointmentsDto,
  ) {
    const result = await this.appointmentsService.listAppointments(callerId, callerRole, query);
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
   * GET /api/v1/appointments/:id
   * Appointment detail. Students can only view their own.
   */
  @Get(':id')
  async getAppointmentById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') callerId: string,
    @CurrentUser('role') callerRole: string,
  ) {
    const data = await this.appointmentsService.getAppointmentById(id, callerId, callerRole);
    return { success: true, data };
  }

  // ── Status transitions ────────────────────────────────────────────────────────

  /**
   * PATCH /api/v1/appointments/:id/check-in
   * Staff checks in a patient. Transitions: scheduled → checked_in.
   */
  @Patch(':id/check-in')
  @UseGuards(RolesGuard)
  @Roles('staff', 'admin')
  async checkIn(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.appointmentsService.checkIn(id);
    return { success: true, data };
  }

  /**
   * PATCH /api/v1/appointments/:id/complete
   * Staff marks appointment as complete. Transitions: scheduled|checked_in → completed.
   */
  @Patch(':id/complete')
  @UseGuards(RolesGuard)
  @Roles('staff', 'admin')
  async complete(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.appointmentsService.complete(id);
    return { success: true, data };
  }

  /**
   * PATCH /api/v1/appointments/:id/cancel
   * Cancel an appointment. Requires cancelReason in body.
   * Students can cancel their own; staff can cancel any scheduled appointment.
   */
  @Patch(':id/cancel')
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') callerId: string,
    @CurrentUser('role') callerRole: string,
    @Body() dto: CancelAppointmentDto,
  ) {
    const data = await this.appointmentsService.cancel(id, callerId, callerRole, dto);
    return { success: true, data };
  }

  /**
   * PATCH /api/v1/appointments/:id/no-show
   * Mark patient as no-show. Transitions: scheduled|checked_in → no_show.
   * Staff/admin only.
   */
  @Patch(':id/no-show')
  @UseGuards(RolesGuard)
  @Roles('staff', 'admin')
  async noShow(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.appointmentsService.noShow(id);
    return { success: true, data };
  }
}
