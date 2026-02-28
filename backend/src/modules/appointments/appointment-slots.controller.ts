import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  ParseIntPipe,
  ParseBoolPipe,
  DefaultValuePipe,
  Optional,
} from '@nestjs/common';

import { AppointmentsService } from './appointments.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateSlotDto } from './dto/create-slot.dto';
import { UpdateSlotDto } from './dto/update-slot.dto';

@Controller('appointment-slots')
@UseGuards(AuthGuard)
export class AppointmentSlotsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  /**
   * GET /api/v1/appointment-slots/available?date=2025-03-01
   * List all active slots available on a given date.
   * Any authenticated user can call this (students need it to book).
   * MUST be defined before :id route.
   */
  @Get('available')
  async getAvailableSlots(@Query('date') date: string) {
    if (!date) {
      return { success: false, error: 'MISSING_PARAM', message: 'date query param is required (YYYY-MM-DD)' };
    }
    const data = await this.appointmentsService.getAvailableSlots(date);
    return { success: true, data };
  }

  /**
   * POST /api/v1/appointment-slots
   * Create a new recurring time slot.
   * If staffId is omitted in body, defaults to the calling staff user's id.
   */
  @Post()
  @UseGuards(RolesGuard)
  @Roles('staff', 'admin')
  @HttpCode(HttpStatus.CREATED)
  async createSlot(
    @CurrentUser('id') callerId: string,
    @Body() dto: CreateSlotDto,
  ) {
    const data = await this.appointmentsService.createSlot(callerId, dto);
    return { success: true, data };
  }

  /**
   * GET /api/v1/appointment-slots
   * List all slots. Query params: staffId (UUID), dayOfWeek (0-6), activeOnly (boolean).
   */
  @Get()
  async listSlots(
    @Query('staffId') staffId?: string,
    @Query('dayOfWeek') dayOfWeek?: string,
    @Query('activeOnly') activeOnly?: string,
  ) {
    const dow = dayOfWeek !== undefined ? parseInt(dayOfWeek, 10) : undefined;
    const active = activeOnly === 'true';
    const data = await this.appointmentsService.listSlots(staffId, dow, active);
    return { success: true, data };
  }

  /**
   * PUT /api/v1/appointment-slots/:id
   * Update a slot's configuration.
   * Staff can only update their own slots; admin can update any.
   */
  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('staff', 'admin')
  async updateSlot(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') callerId: string,
    @CurrentUser('role') callerRole: string,
    @Body() dto: UpdateSlotDto,
  ) {
    const data = await this.appointmentsService.updateSlot(id, callerId, callerRole, dto);
    return { success: true, data };
  }

  /**
   * DELETE /api/v1/appointment-slots/:id
   * Soft-delete: sets is_active = false.
   * Future bookings are unaffected; the slot simply disappears from the booking UI.
   */
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('staff', 'admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deactivateSlot(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') callerId: string,
    @CurrentUser('role') callerRole: string,
  ) {
    await this.appointmentsService.deactivateSlot(id, callerId, callerRole);
  }
}
