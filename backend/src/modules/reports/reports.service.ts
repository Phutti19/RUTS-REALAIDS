import {
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import PDFDocument from 'pdfkit';

import { DatabaseService } from '../../database/db.service';
import { ReportDateRangeDto } from './dto/report-date-range.dto';
import { ExportPdfDto } from './dto/export-pdf.dto';
import {
  DashboardReport,
  DailyStatRow,
  IncidentStatsReport,
  VisitStatsReport,
  MedicineStatsReport,
  StockMovementSummary,
  PdfExportResult,
  DailyReportData,
  MonthlyReportData,
} from './interfaces/reports.interfaces';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function toInt(val: unknown): number {
  return parseInt(String(val ?? '0'), 10);
}

function toFloat(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  const n = parseFloat(String(val));
  return isNaN(n) ? null : Math.round(n * 100) / 100;
}

function rowsToRecord(
  rows: Array<Record<string, unknown>>,
  keyCol: string,
  valCol: string,
): Record<string, number> {
  return rows.reduce<Record<string, number>>((acc, row) => {
    acc[String(row[keyCol])] = toInt(row[valCol]);
    return acc;
  }, {});
}

// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class ReportsService {
  constructor(private readonly db: DatabaseService) {}

  // ── Dashboard ────────────────────────────────────────────────────────────────

  async getDashboard(): Promise<DashboardReport> {
    const [
      incidentStatusRows,
      avgResponseRow,
      visitCountRow,
      lowStockCountRow,
      expiringSoonCountRow,
      apptStatusRows,
    ] = await Promise.all([
      // Incidents today by status
      this.db.queryMany<{ status: string; count: string }>(
        `SELECT status::text, COUNT(*)::text AS count
         FROM emergency_incidents
         WHERE DATE(created_at AT TIME ZONE 'Asia/Bangkok') = CURRENT_DATE
         GROUP BY status`,
      ),

      // Avg response time today (from accepted_at – created_at)
      this.db.queryOne<{ avg_minutes: string | null }>(
        `SELECT ROUND(AVG(
           EXTRACT(EPOCH FROM (ir.accepted_at - ei.created_at)) / 60.0
         )::numeric, 2)::text AS avg_minutes
         FROM emergency_incidents ei
         JOIN incident_responders ir ON ir.incident_id = ei.id
         WHERE DATE(ei.created_at AT TIME ZONE 'Asia/Bangkok') = CURRENT_DATE
           AND ir.accepted_at IS NOT NULL`,
      ),

      // Total patient visits today
      this.db.queryOne<{ count: string }>(
        `SELECT COUNT(*)::text AS count
         FROM patient_visits
         WHERE DATE(created_at AT TIME ZONE 'Asia/Bangkok') = CURRENT_DATE`,
      ),

      // Low-stock medicine count
      this.db.queryOne<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM v_medicines_low_stock`,
      ),

      // Expiring-soon count
      this.db.queryOne<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM v_medicines_expiring_soon`,
      ),

      // Appointments today by status
      this.db.queryMany<{ status: string; count: string }>(
        `SELECT status::text, COUNT(*)::text AS count
         FROM appointments
         WHERE date = CURRENT_DATE
         GROUP BY status`,
      ),
    ]);

    const incidentByStatus = rowsToRecord(incidentStatusRows as Array<Record<string, unknown>>, 'status', 'count');
    const apptByStatus     = rowsToRecord(apptStatusRows as Array<Record<string, unknown>>, 'status', 'count');

    return {
      generatedAt: new Date(),
      incidentsToday: {
        total: Object.values(incidentByStatus).reduce((s, n) => s + n, 0),
        byStatus: incidentByStatus,
        avgResponseTimeMinutes: toFloat(avgResponseRow?.avg_minutes),
      },
      visitsToday: {
        total: toInt(visitCountRow?.count),
      },
      medicinesAlerts: {
        lowStockCount: toInt(lowStockCountRow?.count),
        expiringSoonCount: toInt(expiringSoonCountRow?.count),
      },
      appointmentsToday: {
        total: Object.values(apptByStatus).reduce((s, n) => s + n, 0),
        byStatus: apptByStatus,
      },
    };
  }

  // ── Incident statistics ───────────────────────────────────────────────────────

  async getIncidentStats(dto: ReportDateRangeDto): Promise<IncidentStatsReport> {
    const { from, to } = this.resolveDateRange(dto);

    const [
      totalRow,
      byTypeRows,
      bySeverityRows,
      byStatusRows,
      topLocRows,
      peakHourRows,
      dailyTrendRows,
    ] = await Promise.all([
      // Total incidents in range
      this.db.queryOne<{ count: string }>(
        `SELECT COUNT(*)::text AS count
         FROM emergency_incidents
         WHERE DATE(created_at AT TIME ZONE 'Asia/Bangkok') BETWEEN $1 AND $2`,
        [from, to],
      ),

      // By incident_type
      this.db.queryMany<{ incident_type: string; count: string }>(
        `SELECT incident_type::text, COUNT(*)::text AS count
         FROM emergency_incidents
         WHERE DATE(created_at AT TIME ZONE 'Asia/Bangkok') BETWEEN $1 AND $2
         GROUP BY incident_type ORDER BY count DESC`,
        [from, to],
      ),

      // By severity
      this.db.queryMany<{ severity: string; count: string }>(
        `SELECT severity::text, COUNT(*)::text AS count
         FROM emergency_incidents
         WHERE DATE(created_at AT TIME ZONE 'Asia/Bangkok') BETWEEN $1 AND $2
         GROUP BY severity ORDER BY count DESC`,
        [from, to],
      ),

      // By status
      this.db.queryMany<{ status: string; count: string }>(
        `SELECT status::text, COUNT(*)::text AS count
         FROM emergency_incidents
         WHERE DATE(created_at AT TIME ZONE 'Asia/Bangkok') BETWEEN $1 AND $2
         GROUP BY status ORDER BY count DESC`,
        [from, to],
      ),

      // Top 5 locations by rounded lat/lng (fallback when no location_name)
      this.db.queryMany<{ location: string; count: string }>(
        `SELECT
           ROUND(latitude::numeric, 2)::text || ',' || ROUND(longitude::numeric, 2)::text AS location,
           COUNT(*)::text AS count
         FROM emergency_incidents
         WHERE DATE(created_at AT TIME ZONE 'Asia/Bangkok') BETWEEN $1 AND $2
           AND latitude IS NOT NULL AND longitude IS NOT NULL
         GROUP BY location
         ORDER BY count DESC
         LIMIT 5`,
        [from, to],
      ),

      // Peak hours (0-23)
      this.db.queryMany<{ hour: string; count: string }>(
        `SELECT
           EXTRACT(HOUR FROM created_at AT TIME ZONE 'Asia/Bangkok')::int::text AS hour,
           COUNT(*)::text AS count
         FROM emergency_incidents
         WHERE DATE(created_at AT TIME ZONE 'Asia/Bangkok') BETWEEN $1 AND $2
         GROUP BY hour
         ORDER BY hour ASC`,
        [from, to],
      ),

      // Daily trend from view
      this.db.queryMany<DailyStatRow>(
        `SELECT *
         FROM v_daily_incident_stats
         WHERE incident_date BETWEEN $1::date AND $2::date
         ORDER BY incident_date ASC`,
        [from, to],
      ),
    ]);

    return {
      from,
      to,
      total: toInt(totalRow?.count),
      byType: byTypeRows.map((r) => ({ type: r.incident_type, count: toInt(r.count) })),
      bySeverity: bySeverityRows.map((r) => ({ severity: r.severity, count: toInt(r.count) })),
      byStatus: byStatusRows.map((r) => ({ status: r.status, count: toInt(r.count) })),
      topLocations: topLocRows.map((r) => ({ location: r.location, count: toInt(r.count) })),
      peakHours: peakHourRows.map((r) => ({ hour: toInt(r.hour), count: toInt(r.count) })),
      dailyTrend: dailyTrendRows.map((r) => ({
        date: String(r.incident_date).split('T')[0],
        count: toInt(r.incident_count),
        avgResponseMinutes: toFloat(r.avg_response_time_minutes),
      })),
    };
  }

  // ── Visit statistics ──────────────────────────────────────────────────────────

  async getVisitStats(dto: ReportDateRangeDto): Promise<VisitStatsReport> {
    const { from, to } = this.resolveDateRange(dto);

    const [totalRow, byTypeRows, topMedRows] = await Promise.all([
      // Total visits in range
      this.db.queryOne<{ count: string }>(
        `SELECT COUNT(*)::text AS count
         FROM patient_visits
         WHERE DATE(created_at AT TIME ZONE 'Asia/Bangkok') BETWEEN $1 AND $2`,
        [from, to],
      ),

      // By visit_type
      this.db.queryMany<{ visit_type: string; count: string }>(
        `SELECT visit_type::text, COUNT(*)::text AS count
         FROM patient_visits
         WHERE DATE(created_at AT TIME ZONE 'Asia/Bangkok') BETWEEN $1 AND $2
         GROUP BY visit_type
         ORDER BY count DESC`,
        [from, to],
      ),

      // Top 10 medicines dispensed
      this.db.queryMany<{ medicine_id: string; name: string; total_dispensed: string }>(
        `SELECT m.id AS medicine_id, m.name, SUM(vm.quantity)::text AS total_dispensed
         FROM visit_medications vm
         JOIN medicines m      ON m.id  = vm.medicine_id
         JOIN patient_visits pv ON pv.id = vm.visit_id
         WHERE DATE(pv.created_at AT TIME ZONE 'Asia/Bangkok') BETWEEN $1 AND $2
         GROUP BY m.id, m.name
         ORDER BY total_dispensed DESC
         LIMIT 10`,
        [from, to],
      ),
    ]);

    return {
      from,
      to,
      total: toInt(totalRow?.count),
      byType: byTypeRows.map((r) => ({ type: r.visit_type, count: toInt(r.count) })),
      topMedicines: topMedRows.map((r) => ({
        medicineId: r.medicine_id,
        name: r.name,
        totalDispensed: toInt(r.total_dispensed),
      })),
    };
  }

  // ── Medicine statistics ───────────────────────────────────────────────────────

  async getMedicineStats(): Promise<MedicineStatsReport> {
    const [lowStockRows, expiringSoonRows, movementRows] = await Promise.all([
      this.db.queryMany<Record<string, unknown>>(
        `SELECT * FROM v_medicines_low_stock ORDER BY shortage DESC`,
      ),
      this.db.queryMany<Record<string, unknown>>(
        `SELECT * FROM v_medicines_expiring_soon ORDER BY expiry_date ASC`,
      ),
      this.db.queryMany<{ action: string; total_quantity: string; transactions: string }>(
        `SELECT
           action::text,
           SUM(ABS(quantity_change))::text AS total_quantity,
           COUNT(*)::text AS transactions
         FROM medicine_stock_logs
         WHERE created_at >= NOW() - INTERVAL '30 days'
         GROUP BY action
         ORDER BY transactions DESC`,
      ),
    ]);

    const movement: StockMovementSummary[] = movementRows.map((r) => ({
      action: r.action,
      totalQuantity: toInt(r.total_quantity),
      transactions: toInt(r.transactions),
    }));

    return {
      lowStockCount: lowStockRows.length,
      lowStock: lowStockRows,
      expiringSoonCount: expiringSoonRows.length,
      expiringSoon: expiringSoonRows,
      stockMovement30Days: movement,
    };
  }

  // ── PDF export ────────────────────────────────────────────────────────────────

  async exportPdf(dto: ExportPdfDto): Promise<PdfExportResult> {
    if (dto.type === 'daily') {
      return this.buildDailyPdf(dto.date);
    }
    return this.buildMonthlyPdf(dto.date);
  }

  private async buildDailyPdf(dateStr: string): Promise<PdfExportResult> {
    const dateRange: ReportDateRangeDto = { from: dateStr, to: dateStr };

    const [incidents, visits, medicines] = await Promise.all([
      this.getIncidentStats(dateRange),
      this.getVisitStats(dateRange),
      this.getMedicineStats(),
    ]);

    const data: DailyReportData = { date: dateStr, incidents, visits, medicines };
    const buffer = await this.renderDailyPdf(data);

    return {
      filename: `daily-report-${dateStr}.pdf`,
      buffer,
    };
  }

  private async buildMonthlyPdf(dateStr: string): Promise<PdfExportResult> {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) throw new BadRequestException('Invalid date.');

    const year  = d.getFullYear();
    const month = d.getMonth() + 1; // 1–12
    const from  = `${year}-${String(month).padStart(2, '0')}-01`;
    // Last day of the month
    const lastDay = new Date(year, month, 0).getDate();
    const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const dateRange: ReportDateRangeDto = { from, to };

    const [incidents, visits, medicines] = await Promise.all([
      this.getIncidentStats(dateRange),
      this.getVisitStats(dateRange),
      this.getMedicineStats(),
    ]);

    const data: MonthlyReportData = { year, month, incidents, visits, medicines };
    const buffer = await this.renderMonthlyPdf(data);

    return {
      filename: `monthly-report-${year}-${String(month).padStart(2, '0')}.pdf`,
      buffer,
    };
  }

  // ── PDF rendering ─────────────────────────────────────────────────────────────

  private renderDailyPdf(data: DailyReportData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const PAGE_W = doc.page.width - 100; // usable width (margins = 50 each side)

      // ── Header ──
      doc
        .fontSize(18)
        .font('Helvetica-Bold')
        .text('Rajamangala University of Technology Srivijaya', { align: 'center' });
      doc
        .fontSize(14)
        .text('RUTS-REALAIDS — Daily Report', { align: 'center' });
      doc
        .fontSize(11)
        .font('Helvetica')
        .text(`Date: ${data.date}`, { align: 'center' });
      doc.text(`Generated: ${new Date().toISOString()}`, { align: 'center' });

      doc.moveDown(1).moveTo(50, doc.y).lineTo(50 + PAGE_W, doc.y).stroke();
      doc.moveDown(0.5);

      // ── Section 1: Emergency Incidents ──
      this.pdfSection(doc, '1. Emergency Incidents');
      this.pdfLabelValue(doc, 'Total Incidents', String(data.incidents.total));
      const avgMin = data.incidents.dailyTrend[0]?.avgResponseMinutes;
      this.pdfLabelValue(doc, 'Avg Response Time', avgMin != null ? `${avgMin} min` : 'N/A');

      if (data.incidents.byType.length > 0) {
        doc.moveDown(0.3).font('Helvetica-Bold').text('By Type:').font('Helvetica');
        data.incidents.byType.forEach((r) =>
          doc.text(`  ${r.type.padEnd(20)}  ${r.count}`, { indent: 10 }),
        );
      }

      if (data.incidents.bySeverity.length > 0) {
        doc.moveDown(0.3).font('Helvetica-Bold').text('By Severity:').font('Helvetica');
        data.incidents.bySeverity.forEach((r) =>
          doc.text(`  ${r.severity.padEnd(20)}  ${r.count}`, { indent: 10 }),
        );
      }

      if (data.incidents.byStatus.length > 0) {
        doc.moveDown(0.3).font('Helvetica-Bold').text('By Status:').font('Helvetica');
        data.incidents.byStatus.forEach((r) =>
          doc.text(`  ${r.status.padEnd(20)}  ${r.count}`, { indent: 10 }),
        );
      }

      if (data.incidents.peakHours.length > 0) {
        doc.moveDown(0.3).font('Helvetica-Bold').text('Peak Hours:').font('Helvetica');
        const peaks = data.incidents.peakHours
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
        peaks.forEach((r) =>
          doc.text(`  ${String(r.hour).padStart(2, '0')}:00  —  ${r.count} incidents`, { indent: 10 }),
        );
      }

      doc.moveDown(0.8);

      // ── Section 2: Patient Visits ──
      this.pdfSection(doc, '2. Patient Visits');
      this.pdfLabelValue(doc, 'Total Visits', String(data.visits.total));

      if (data.visits.byType.length > 0) {
        doc.moveDown(0.3).font('Helvetica-Bold').text('By Visit Type:').font('Helvetica');
        data.visits.byType.forEach((r) =>
          doc.text(`  ${r.type.padEnd(20)}  ${r.count}`, { indent: 10 }),
        );
      }

      if (data.visits.topMedicines.length > 0) {
        doc.moveDown(0.3).font('Helvetica-Bold').text('Top Medicines Dispensed:').font('Helvetica');
        data.visits.topMedicines.slice(0, 10).forEach((m, i) =>
          doc.text(`  ${i + 1}. ${m.name.padEnd(30)}  ${m.totalDispensed} units`, { indent: 10 }),
        );
      }

      doc.moveDown(0.8);

      // ── Section 3: Medicine Alerts ──
      this.pdfSection(doc, '3. Medicine Inventory Alerts');
      this.pdfLabelValue(doc, 'Low Stock Count',     String(data.medicines.lowStockCount));
      this.pdfLabelValue(doc, 'Expiring Soon Count', String(data.medicines.expiringSoonCount));

      if (data.medicines.stockMovement30Days.length > 0) {
        doc.moveDown(0.3).font('Helvetica-Bold').text('Stock Movement (Last 30 Days):').font('Helvetica');
        data.medicines.stockMovement30Days.forEach((s) =>
          doc.text(`  ${s.action.padEnd(15)}  Qty: ${s.totalQuantity}  Transactions: ${s.transactions}`, { indent: 10 }),
        );
      }

      doc.end();
    });
  }

  private renderMonthlyPdf(data: MonthlyReportData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const PAGE_W = doc.page.width - 100;
      const monthName = new Date(data.year, data.month - 1).toLocaleString('en-US', { month: 'long' });

      // ── Header ──
      doc
        .fontSize(18)
        .font('Helvetica-Bold')
        .text('Rajamangala University of Technology Srivijaya', { align: 'center' });
      doc
        .fontSize(14)
        .text('RUTS-REALAIDS — Monthly Report', { align: 'center' });
      doc
        .fontSize(11)
        .font('Helvetica')
        .text(`Period: ${monthName} ${data.year}  (${data.incidents.from} to ${data.incidents.to})`, { align: 'center' });
      doc.text(`Generated: ${new Date().toISOString()}`, { align: 'center' });

      doc.moveDown(1).moveTo(50, doc.y).lineTo(50 + PAGE_W, doc.y).stroke();
      doc.moveDown(0.5);

      // ── Section 1: Incidents ──
      this.pdfSection(doc, '1. Emergency Incidents');
      this.pdfLabelValue(doc, 'Total Incidents', String(data.incidents.total));

      if (data.incidents.byType.length > 0) {
        doc.moveDown(0.3).font('Helvetica-Bold').text('By Incident Type:').font('Helvetica');
        data.incidents.byType.forEach((r) =>
          doc.text(`  ${r.type.padEnd(20)}  ${r.count}`, { indent: 10 }),
        );
      }
      if (data.incidents.bySeverity.length > 0) {
        doc.moveDown(0.3).font('Helvetica-Bold').text('By Severity:').font('Helvetica');
        data.incidents.bySeverity.forEach((r) =>
          doc.text(`  ${r.severity.padEnd(20)}  ${r.count}`, { indent: 10 }),
        );
      }
      if (data.incidents.topLocations.length > 0) {
        doc.moveDown(0.3).font('Helvetica-Bold').text('Top Incident Locations:').font('Helvetica');
        data.incidents.topLocations.forEach((l, i) =>
          doc.text(`  ${i + 1}. ${l.location}  —  ${l.count} incidents`, { indent: 10 }),
        );
      }

      // Daily trend table (abbreviated)
      if (data.incidents.dailyTrend.length > 0) {
        doc.moveDown(0.3).font('Helvetica-Bold').text('Daily Trend:').font('Helvetica');
        data.incidents.dailyTrend.forEach((d) => {
          const avg = d.avgResponseMinutes != null ? `${d.avgResponseMinutes} min` : '-';
          doc.text(`  ${d.date}  Incidents: ${d.count}  Avg Response: ${avg}`, { indent: 10 });
        });
      }

      doc.addPage();

      // ── Section 2: Patient Visits ──
      this.pdfSection(doc, '2. Patient Visits');
      this.pdfLabelValue(doc, 'Total Visits', String(data.visits.total));

      if (data.visits.byType.length > 0) {
        doc.moveDown(0.3).font('Helvetica-Bold').text('By Visit Type:').font('Helvetica');
        data.visits.byType.forEach((r) =>
          doc.text(`  ${r.type.padEnd(20)}  ${r.count}`, { indent: 10 }),
        );
      }
      if (data.visits.topMedicines.length > 0) {
        doc.moveDown(0.3).font('Helvetica-Bold').text('Top 10 Medicines Dispensed:').font('Helvetica');
        data.visits.topMedicines.forEach((m, i) =>
          doc.text(`  ${i + 1}. ${m.name.padEnd(30)}  ${m.totalDispensed} units`, { indent: 10 }),
        );
      }

      doc.moveDown(0.8);

      // ── Section 3: Medicine Inventory ──
      this.pdfSection(doc, '3. Medicine Inventory');
      this.pdfLabelValue(doc, 'Low Stock Items',     String(data.medicines.lowStockCount));
      this.pdfLabelValue(doc, 'Expiring Soon Items', String(data.medicines.expiringSoonCount));

      if (data.medicines.stockMovement30Days.length > 0) {
        doc.moveDown(0.3).font('Helvetica-Bold').text('Stock Movement (Last 30 Days):').font('Helvetica');
        data.medicines.stockMovement30Days.forEach((s) =>
          doc.text(`  ${s.action.padEnd(15)}  Qty: ${s.totalQuantity}  Transactions: ${s.transactions}`, { indent: 10 }),
        );
      }

      doc.end();
    });
  }

  // ── Private helpers ───────────────────────────────────────────────────────────

  private pdfSection(doc: PDFKit.PDFDocument, title: string): void {
    doc
      .moveDown(0.5)
      .fontSize(13)
      .font('Helvetica-Bold')
      .text(title)
      .fontSize(10)
      .font('Helvetica')
      .moveDown(0.2);
  }

  private pdfLabelValue(doc: PDFKit.PDFDocument, label: string, value: string): void {
    doc
      .font('Helvetica-Bold')
      .text(`${label}: `, { continued: true })
      .font('Helvetica')
      .text(value);
  }

  /**
   * Resolve from/to date strings. Defaults:
   *  - from: first day of current month
   *  - to:   today
   */
  private resolveDateRange(dto: ReportDateRangeDto): { from: string; to: string } {
    const today = new Date();
    const toDateStr = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const to   = dto.to   ?? toDateStr(today);
    const from = dto.from ?? toDateStr(new Date(today.getFullYear(), today.getMonth(), 1));

    if (new Date(from) > new Date(to)) {
      throw new BadRequestException(`'from' date must not be after 'to' date.`);
    }

    return { from, to };
  }
}
