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

import { VisitsService } from './visits.service';
import { CertificatesService } from '../certificates/certificates.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateVisitDto } from './dto/create-visit.dto';
import { UpdateVisitDto } from './dto/update-visit.dto';
import { ListVisitsDto } from './dto/list-visits.dto';
import { DispenseMedicationDto } from './dto/dispense-medication.dto';
import { RegisterWalkInPatientDto } from './dto/register-walkin-patient.dto';
import { CreateCertificateForVisitDto } from '../certificates/dto/create-certificate-for-visit.dto';

@Controller('visits')
@UseGuards(AuthGuard) // All visits routes require authentication
export class VisitsController {
  constructor(
    private readonly visitsService: VisitsService,
    private readonly certificatesService: CertificatesService,
  ) {}

  // ── Walk-in registration (must come before :id routes) ───────────────────────

  /**
   * POST /api/v1/visits/register-patient
   * Create a student account for a walk-in patient who hasn't registered yet.
   * Password is set to studentId. Returns the new user record.
   * Available to: staff, admin only
   */
  @Post('register-patient')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RolesGuard)
  @Roles('staff', 'admin')
  async registerWalkInPatient(@Body() dto: RegisterWalkInPatientDto) {
    const data = await this.visitsService.registerWalkInPatient(dto);
    return { success: true, data };
  }

  // ── Queue (must come before :id to avoid "queue" being parsed as a UUID) ─────

  /**
   * GET /api/v1/visits/queue
   * Returns waiting and in-treatment patients ordered by arrival time.
   * Available to: staff, admin only
   */
  @Get('queue')
  @UseGuards(RolesGuard)
  @Roles('staff', 'admin')
  async getQueue() {
    const data = await this.visitsService.getQueue();
    return { success: true, data };
  }

  // ── Create ───────────────────────────────────────────────────────────────────

  /**
   * POST /api/v1/visits
   * Open a new patient visit (walk-in, emergency, appointment, follow-up).
   * Broadcasts queue:update to all connected staff.
   * Available to: staff, admin only
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RolesGuard)
  @Roles('staff', 'admin')
  async createVisit(
    @CurrentUser('id') staffId: string,
    @Body() dto: CreateVisitDto,
  ) {
    const data = await this.visitsService.createVisit(staffId, dto);
    return { success: true, data };
  }

  // ── List ─────────────────────────────────────────────────────────────────────

  /**
   * GET /api/v1/visits
   * Paginated visit list with optional filters.
   * - Staff/admin: see all visits
   * - Students: see only their own visits
   *
   * Query params: page, limit, status, visitType, patientId (staff only),
   *               staffId, from, to, search, sortBy, order
   */
  @Get()
  async listVisits(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Query() query: ListVisitsDto,
  ) {
    const result = await this.visitsService.listVisits(query, userId, role);
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
   * GET /api/v1/visits/:id
   * Full visit details including patient, staff, vital signs.
   * - Staff/admin: any visit
   * - Students: own visits only (403 otherwise)
   */
  @Get(':id')
  async getVisitById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    const data = await this.visitsService.getVisitById(id, userId, role);
    return { success: true, data };
  }

  // ── Update ───────────────────────────────────────────────────────────────────

  /**
   * PATCH /api/v1/visits/:id
   * Update visit fields: diagnosis, treatmentNotes, vitalSigns, status.
   * Broadcasts queue:update when status changes.
   * Available to: staff, admin only
   */
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles('staff', 'admin')
  async updateVisit(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') staffId: string,
    @Body() dto: UpdateVisitDto,
  ) {
    const data = await this.visitsService.updateVisit(id, staffId, dto);
    return { success: true, data };
  }

  // ── Medications ───────────────────────────────────────────────────────────────

  /**
   * POST /api/v1/visits/:id/medications
   * Dispense medicine for a visit.
   * - Batch selected automatically (FIFO by earliest expiry date)
   * - Deducts from medicine_batches and updates cached medicines.stock_quantity
   * - Broadcasts stock:alert if stock falls below min_stock_level
   * Available to: staff, admin only
   */
  @Post(':id/medications')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RolesGuard)
  @Roles('staff', 'admin')
  async dispenseMedication(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') staffId: string,
    @Body() dto: DispenseMedicationDto,
  ) {
    const data = await this.visitsService.dispenseMedication(id, staffId, dto);
    return { success: true, data };
  }

  // ── Certificate ───────────────────────────────────────────────────────────────

  /**
   * GET /api/v1/visits/:id/certificate
   * Get the medical certificate for a visit (null if not yet issued).
   */
  @Get(':id/certificate')
  async getVisitCertificate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    const data = await this.certificatesService.getByVisitId(id, userId, role);
    return { success: true, data };
  }

  /**
   * POST /api/v1/visits/:id/certificate
   * Issue a medical certificate for the visit. One per visit (409 if exists).
   * Available to: staff, admin only
   */
  @Post(':id/certificate')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RolesGuard)
  @Roles('staff', 'admin')
  async createVisitCertificate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') staffId: string,
    @Body() dto: CreateCertificateForVisitDto,
  ) {
    const data = await this.certificatesService.createCertificate(staffId, {
      visitId: id,
      ...dto,
    });
    return { success: true, data };
  }

  /**
   * GET /api/v1/visits/:id/medications
   * List all medications dispensed for a visit.
   * - Staff/admin: any visit
   * - Students: own visits only
   */
  @Get(':id/medications')
  async getVisitMedications(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    const data = await this.visitsService.getVisitMedications(id, userId, role);
    return { success: true, data };
  }
}
