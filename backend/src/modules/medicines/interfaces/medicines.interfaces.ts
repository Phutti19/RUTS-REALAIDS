// ── DB row shapes ──────────────────────────────────────────────────────────────

export interface MedicineRow {
  id: string;
  name: string;
  category: string;
  description: string | null;
  unit: string | null;
  stock_quantity: number;
  min_stock_level: number;
  created_at: Date;
  updated_at: Date;
}

export interface MedicineBatchRow {
  id: string;
  medicine_id: string;
  batch_number: string;
  quantity: number;
  expiry_date: Date;
  created_at: Date;
}

export interface MedicineStockLogRow {
  id: string;
  medicine_id: string;
  batch_id: string | null;
  action: string;
  quantity_change: number;
  notes: string | null;
  created_at: Date;
}

/**
 * Row returned by v_medicines_low_stock view.
 * Expected: SELECT m.*, (m.min_stock_level - m.stock_quantity) AS shortage
 *           FROM medicines m WHERE m.stock_quantity <= m.min_stock_level
 */
export interface LowStockViewRow extends MedicineRow {
  shortage: number;
}

/**
 * Row returned by v_medicines_expiring_soon view.
 * Expected: SELECT m.id AS medicine_id, m.name AS medicine_name, m.category,
 *                  mb.id AS batch_id, mb.batch_number, mb.quantity, mb.expiry_date,
 *                  (mb.expiry_date - CURRENT_DATE) AS days_until_expiry
 *           FROM medicine_batches mb
 *           JOIN medicines m ON m.id = mb.medicine_id
 *           WHERE mb.expiry_date <= CURRENT_DATE + INTERVAL '30 days'
 *             AND mb.expiry_date > CURRENT_DATE AND mb.quantity > 0
 */
export interface ExpiringViewRow {
  medicine_id: string;
  medicine_name: string;
  category: string;
  batch_id: string;
  batch_number: string;
  quantity: number;
  expiry_date: Date;
  days_until_expiry: number;
}

// ── API response shapes (camelCase) ───────────────────────────────────────────

export interface Medicine {
  id: string;
  name: string;
  category: string;
  description: string | null;
  unit: string | null;
  stockQuantity: number;
  minStockLevel: number;
  isLowStock: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MedicineBatch {
  id: string;
  medicineId: string;
  batchNumber: string;
  quantity: number;
  expiryDate: Date;
  isExpired: boolean;
  isExpiringSoon: boolean;
  createdAt: Date;
}

export interface StockLog {
  id: string;
  medicineId: string;
  batchId: string | null;
  action: string;
  quantityChange: number;
  notes: string | null;
  createdAt: Date;
}

export interface LowStockAlert extends Medicine {
  shortage: number;
}

export interface ExpiringAlert {
  medicineId: string;
  medicineName: string;
  category: string;
  batchId: string;
  batchNumber: string;
  quantity: number;
  expiryDate: Date;
  daysUntilExpiry: number;
}
