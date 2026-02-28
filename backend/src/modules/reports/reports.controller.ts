import {
  Controller,
  Get,
  Query,
  UseGuards,
  Res,
} from '@nestjs/common';
import { Response } from 'express';

import { ReportsService } from './reports.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ReportDateRangeDto } from './dto/report-date-range.dto';
import { ExportPdfDto } from './dto/export-pdf.dto';

@Controller('reports')
@UseGuards(AuthGuard, RolesGuard)
@Roles('staff', 'admin')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  /**
   * GET /api/v1/reports/export/pdf?type=daily&date=2025-03-01
   * Streams a PDF report. Defined FIRST to avoid route ambiguity.
   *
   * type=daily   → single-day summary (incidents + visits + medicine alerts)
   * type=monthly → full month (first–last day of the given date's month)
   */
  @Get('export/pdf')
  async exportPdf(
    @Query() query: ExportPdfDto,
    @Res() res: Response,
  ) {
    const { filename, buffer } = await this.reportsService.exportPdf(query);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(buffer.length),
    });
    res.end(buffer);
  }

  /**
   * GET /api/v1/reports/dashboard
   * Real-time overview for today:
   *   - incidents by status + avg response time
   *   - patient visits count
   *   - low-stock & expiring-soon medicine counts
   *   - appointments by status
   */
  @Get('dashboard')
  async getDashboard() {
    const data = await this.reportsService.getDashboard();
    return { success: true, data };
  }

  /**
   * GET /api/v1/reports/incidents?from=YYYY-MM-DD&to=YYYY-MM-DD
   * Incident statistics for a date range. Defaults to current month.
   *   - total, by type, by severity, by status
   *   - top 5 locations (grouped by rounded lat/lng)
   *   - peak hours (0–23)
   *   - daily trend from v_daily_incident_stats
   */
  @Get('incidents')
  async getIncidentStats(@Query() query: ReportDateRangeDto) {
    const data = await this.reportsService.getIncidentStats(query);
    return { success: true, data };
  }

  /**
   * GET /api/v1/reports/visits?from=YYYY-MM-DD&to=YYYY-MM-DD
   * Visit statistics for a date range. Defaults to current month.
   *   - total, by visit type
   *   - top 10 medicines dispensed
   */
  @Get('visits')
  async getVisitStats(@Query() query: ReportDateRangeDto) {
    const data = await this.reportsService.getVisitStats(query);
    return { success: true, data };
  }

  /**
   * GET /api/v1/reports/medicines
   * Medicine inventory report (no date range — reflects current state):
   *   - low-stock list from v_medicines_low_stock
   *   - expiring-soon list from v_medicines_expiring_soon
   *   - stock movement summary for the last 30 days
   */
  @Get('medicines')
  async getMedicineStats() {
    const data = await this.reportsService.getMedicineStats();
    return { success: true, data };
  }
}
