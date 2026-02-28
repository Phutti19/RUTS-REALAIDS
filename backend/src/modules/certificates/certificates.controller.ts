import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Res,
} from '@nestjs/common';
import { Response } from 'express';

import { CertificatesService } from './certificates.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateCertificateDto } from './dto/create-certificate.dto';
import { ListCertificatesDto } from './dto/list-certificates.dto';

@Controller('certificates')
@UseGuards(AuthGuard) // All certificate routes require authentication
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  // ── Create ───────────────────────────────────────────────────────────────────

  /**
   * POST /api/v1/certificates
   * Issue a new medical certificate for a patient visit.
   * Certificate number auto-generated: CERT-YYYY-NNNNNN
   * One certificate per visit (409 if already exists).
   * Available to: staff, admin only
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RolesGuard)
  @Roles('staff', 'admin')
  async createCertificate(
    @CurrentUser('id') staffId: string,
    @Body() dto: CreateCertificateDto,
  ) {
    const data = await this.certificatesService.createCertificate(staffId, dto);
    return { success: true, data };
  }

  // ── List ─────────────────────────────────────────────────────────────────────

  /**
   * GET /api/v1/certificates
   * Paginated list from v_medical_certificates view.
   * - Staff/admin: see all
   * - Students: see only their own
   *
   * Query params: page, limit, patientId (staff only), visitId,
   *               search, from, to, sortBy, order
   */
  @Get()
  async listCertificates(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Query() query: ListCertificatesDto,
  ) {
    const result = await this.certificatesService.listCertificates(
      query,
      userId,
      role,
    );
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
   * GET /api/v1/certificates/:id
   * Full certificate detail via v_medical_certificates view.
   * - Staff/admin: any certificate
   * - Students: own certificates only
   */
  @Get(':id')
  async getCertificateById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    const data = await this.certificatesService.getById(id, userId, role);
    return { success: true, data };
  }

  // ── PDF export ────────────────────────────────────────────────────────────────

  /**
   * GET /api/v1/certificates/:id/pdf
   * Stream the certificate as a downloadable PDF file.
   * Filename: <certificate_number>.pdf  e.g. CERT-2025-000001.pdf
   * - Staff/admin: any certificate
   * - Students: own certificates only
   */
  @Get(':id/pdf')
  async downloadPdf(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Res() res: Response,
  ) {
    const { certificateNumber, buffer } =
      await this.certificatesService.generatePdf(id, userId, role);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${certificateNumber}.pdf"`,
      'Content-Length': String(buffer.length),
    });

    res.end(buffer);
  }
}
