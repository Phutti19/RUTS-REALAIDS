// ── Dashboard ──────────────────────────────────────────────────────────────────

export interface DashboardReport {
  generatedAt: Date;
  incidentsToday: {
    total: number;
    byStatus: Record<string, number>;
    avgResponseTimeMinutes: number | null;
  };
  visitsToday: {
    total: number;
  };
  medicinesAlerts: {
    lowStockCount: number;
    expiringSoonCount: number;
  };
  appointmentsToday: {
    total: number;
    byStatus: Record<string, number>;
  };
}

// ── Incident statistics ────────────────────────────────────────────────────────

/**
 * Row from v_daily_incident_stats view.
 * Actual columns: incident_date, total_incidents, avg_response_minutes
 */
export interface DailyStatRow {
  incident_date: Date | string;
  total_incidents: number | string;
  avg_response_minutes: number | string | null;
}

export interface IncidentStatsReport {
  from: string;
  to: string;
  total: number;
  byType: Array<{ type: string; count: number }>;
  bySeverity: Array<{ severity: string; count: number }>;
  byStatus: Array<{ status: string; count: number }>;
  /** Top 5 approximate locations grouped by rounded lat/lng */
  topLocations: Array<{ location: string; count: number }>;
  /** Count of incidents per hour of the day (0–23) */
  peakHours: Array<{ hour: number; count: number }>;
  /** Daily trend from v_daily_incident_stats */
  dailyTrend: Array<{ date: string; count: number; avgResponseMinutes: number | null }>;
}

// ── Visit statistics ───────────────────────────────────────────────────────────

export interface VisitStatsReport {
  from: string;
  to: string;
  total: number;
  byType: Array<{ type: string; count: number }>;
  topMedicines: Array<{ medicineId: string; name: string; totalDispensed: number }>;
}

// ── Medicine statistics ────────────────────────────────────────────────────────

export interface StockMovementSummary {
  action: string;
  totalQuantity: number;
  transactions: number;
}

export interface MedicineStatsReport {
  lowStockCount: number;
  lowStock: Array<Record<string, unknown>>;
  expiringSoonCount: number;
  expiringSoon: Array<Record<string, unknown>>;
  stockMovement30Days: StockMovementSummary[];
}

// ── PDF export ─────────────────────────────────────────────────────────────────

export interface PdfExportResult {
  filename: string;
  buffer: Buffer;
}

/** Aggregated data fed into the PDF builder */
export interface DailyReportData {
  date: string;
  incidents: IncidentStatsReport;
  visits: VisitStatsReport;
  medicines: MedicineStatsReport;
}

export interface MonthlyReportData {
  year: number;
  month: number; // 1–12
  incidents: IncidentStatsReport;
  visits: VisitStatsReport;
  medicines: MedicineStatsReport;
}
