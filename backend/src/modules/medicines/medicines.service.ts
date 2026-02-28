import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';

import { DatabaseService, PaginatedResult } from '../../database/db.service';
import { CreateMedicineDto } from './dto/create-medicine.dto';
import { UpdateMedicineDto } from './dto/update-medicine.dto';
import { ListMedicinesDto } from './dto/list-medicines.dto';
import { AddBatchDto } from './dto/add-batch.dto';
import { ListStockLogsDto } from './dto/list-stock-logs.dto';
import {
  MedicineRow,
  MedicineBatchRow,
  MedicineStockLogRow,
  LowStockViewRow,
  ExpiringViewRow,
  Medicine,
  MedicineBatch,
  StockLog,
  LowStockAlert,
  ExpiringAlert,
} from './interfaces/medicines.interfaces';

/** Days threshold for "expiring soon" badge on batch responses */
const EXPIRING_SOON_DAYS = 30;

@Injectable()
export class MedicinesService {
  private readonly logger = new Logger(MedicinesService.name);

  constructor(private readonly db: DatabaseService) {}

  // ── Create ───────────────────────────────────────────────────────────────────

  async createMedicine(dto: CreateMedicineDto): Promise<Medicine> {
    // Prevent duplicate names (case-insensitive)
    const existing = await this.db.queryOne<{ id: string }>(
      `SELECT id FROM medicines WHERE LOWER(name) = LOWER($1)`,
      [dto.name],
    );
    if (existing) {
      throw new ConflictException(`A medicine named '${dto.name}' already exists.`);
    }

    const row = await this.db.queryOne<MedicineRow>(
      `INSERT INTO medicines (name, category, description, unit, min_stock_level)
       VALUES ($1, $2::medicine_category, $3, $4, $5)
       RETURNING *`,
      [
        dto.name,
        dto.category,
        dto.description ?? null,
        dto.unit ?? null,
        dto.minStockLevel ?? 0,
      ],
    );

    this.logger.log(`Medicine created: ${row!.id} name="${dto.name}"`);
    return this.formatMedicine(row!);
  }

  // ── List ─────────────────────────────────────────────────────────────────────

  async listMedicines(dto: ListMedicinesDto): Promise<PaginatedResult<Medicine>> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (dto.category) {
      conditions.push(`m.category = $${idx++}::medicine_category`);
      values.push(dto.category);
    }

    if (dto.search) {
      conditions.push(`m.name ILIKE $${idx}`);
      values.push(`%${dto.search}%`);
      idx++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const allowedSort: Record<string, string> = {
      name: 'm.name',
      stock_quantity: 'm.stock_quantity',
      category: 'm.category',
      created_at: 'm.created_at',
    };
    const sortCol = allowedSort[dto.sortBy ?? 'name'] ?? 'm.name';
    const sortDir = dto.order === 'desc' ? 'DESC' : 'ASC';

    const countSql = `SELECT COUNT(*) FROM medicines m ${where}`;
    const dataSql = `SELECT m.* FROM medicines m ${where} ORDER BY ${sortCol} ${sortDir}`;

    const result = await this.db.queryPaginated<MedicineRow>(
      countSql,
      dataSql,
      values,
      { page: dto.page, limit: dto.limit },
    );

    return {
      ...result,
      data: result.data.map((row) => this.formatMedicine(row)),
    };
  }

  // ── Get detail ───────────────────────────────────────────────────────────────

  async getMedicineById(id: string): Promise<Medicine> {
    const row = await this.db.queryOne<MedicineRow>(
      `SELECT * FROM medicines WHERE id = $1`,
      [id],
    );
    if (!row) throw new NotFoundException(`Medicine '${id}' not found`);
    return this.formatMedicine(row);
  }

  // ── Update ───────────────────────────────────────────────────────────────────

  async updateMedicine(id: string, dto: UpdateMedicineDto): Promise<Medicine> {
    await this.getMedicineById(id); // throws NotFoundException if missing

    // Check name conflict if name is changing
    if (dto.name !== undefined) {
      const conflict = await this.db.queryOne<{ id: string }>(
        `SELECT id FROM medicines WHERE LOWER(name) = LOWER($1) AND id <> $2`,
        [dto.name, id],
      );
      if (conflict) {
        throw new ConflictException(`A medicine named '${dto.name}' already exists.`);
      }
    }

    // Build dynamic SET clause
    const sets: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (dto.name !== undefined) {
      sets.push(`name = $${idx++}`);
      values.push(dto.name);
    }
    if (dto.category !== undefined) {
      sets.push(`category = $${idx++}::medicine_category`);
      values.push(dto.category);
    }
    if (dto.description !== undefined) {
      sets.push(`description = $${idx++}`);
      values.push(dto.description);
    }
    if (dto.unit !== undefined) {
      sets.push(`unit = $${idx++}`);
      values.push(dto.unit);
    }
    if (dto.minStockLevel !== undefined) {
      sets.push(`min_stock_level = $${idx++}`);
      values.push(dto.minStockLevel);
    }

    if (sets.length === 0) {
      return this.getMedicineById(id);
    }

    sets.push(`updated_at = NOW()`);
    values.push(id);

    const row = await this.db.queryOne<MedicineRow>(
      `UPDATE medicines SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      values,
    );

    this.logger.log(`Medicine updated: ${id}`);
    return this.formatMedicine(row!);
  }

  // ── Delete ───────────────────────────────────────────────────────────────────

  async deleteMedicine(id: string): Promise<void> {
    await this.getMedicineById(id); // throws NotFoundException if missing

    // Prevent deletion if medicine has been used in patient visits
    const inUse = await this.db.queryOne<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM visit_medications WHERE medicine_id = $1`,
      [id],
    );
    if (inUse && parseInt(inUse.count, 10) > 0) {
      throw new ConflictException(
        'Medicine cannot be deleted because it is referenced by patient visit records.',
      );
    }

    // Delete stock logs, batches, then the medicine itself
    await this.db.transaction(async (client) => {
      await client.query(
        `DELETE FROM medicine_stock_logs WHERE medicine_id = $1`,
        [id],
      );
      await client.query(
        `DELETE FROM medicine_batches WHERE medicine_id = $1`,
        [id],
      );
      await client.query(`DELETE FROM medicines WHERE id = $1`, [id]);
    });

    this.logger.log(`Medicine deleted: ${id}`);
  }

  // ── Batches ──────────────────────────────────────────────────────────────────

  /**
   * Add a new stock batch.
   * Atomically: INSERT batch + UPDATE cached stock_quantity + INSERT stock_log(received)
   */
  async addBatch(medicineId: string, dto: AddBatchDto): Promise<MedicineBatch> {
    await this.getMedicineById(medicineId); // throws NotFoundException if missing

    // Validate expiry date is in the future
    const expiry = new Date(dto.expiryDate);
    if (expiry <= new Date()) {
      throw new BadRequestException('Expiry date must be in the future.');
    }

    const batch = await this.db.transaction(async (client) => {
      // Insert batch
      const batchResult = await client.query<MedicineBatchRow>(
        `INSERT INTO medicine_batches (medicine_id, batch_number, quantity, expiry_date)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [medicineId, dto.batchNumber, dto.quantity, dto.expiryDate],
      );
      const newBatch = batchResult.rows[0];

      // Update cached medicine stock_quantity
      await client.query(
        `UPDATE medicines SET stock_quantity = stock_quantity + $1, updated_at = NOW() WHERE id = $2`,
        [dto.quantity, medicineId],
      );

      // Record stock movement
      await client.query(
        `INSERT INTO medicine_stock_logs (medicine_id, batch_id, action, quantity_change, notes)
         VALUES ($1, $2, 'received', $3, $4)`,
        [
          medicineId,
          newBatch.id,
          dto.quantity,
          dto.notes ?? `Batch ${dto.batchNumber} received`,
        ],
      );

      return newBatch;
    });

    this.logger.log(
      `Batch added: medicine=${medicineId} batch=${dto.batchNumber} qty=${dto.quantity}`,
    );
    return this.formatBatch(batch);
  }

  async getBatches(medicineId: string): Promise<MedicineBatch[]> {
    await this.getMedicineById(medicineId); // throws NotFoundException if missing

    const rows = await this.db.queryMany<MedicineBatchRow>(
      `SELECT * FROM medicine_batches WHERE medicine_id = $1 ORDER BY expiry_date ASC`,
      [medicineId],
    );
    return rows.map((row) => this.formatBatch(row));
  }

  // ── Stock logs ────────────────────────────────────────────────────────────────

  async getStockLogs(
    medicineId: string,
    dto: ListStockLogsDto,
  ): Promise<PaginatedResult<StockLog>> {
    await this.getMedicineById(medicineId); // throws NotFoundException if missing

    const conditions: string[] = [`sl.medicine_id = $1`];
    const values: unknown[] = [medicineId];
    let idx = 2;

    if (dto.action) {
      conditions.push(`sl.action = $${idx++}::stock_action`);
      values.push(dto.action);
    }
    if (dto.from) {
      conditions.push(`sl.created_at >= $${idx++}`);
      values.push(dto.from);
    }
    if (dto.to) {
      conditions.push(`sl.created_at <= $${idx++}`);
      values.push(dto.to);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const countSql = `SELECT COUNT(*) FROM medicine_stock_logs sl ${where}`;
    const dataSql = `
      SELECT sl.*
      FROM medicine_stock_logs sl
      ${where}
      ORDER BY sl.created_at DESC
    `;

    const result = await this.db.queryPaginated<MedicineStockLogRow>(
      countSql,
      dataSql,
      values,
      { page: dto.page, limit: dto.limit },
    );

    return {
      ...result,
      data: result.data.map((row) => this.formatStockLog(row)),
    };
  }

  // ── Alerts ────────────────────────────────────────────────────────────────────

  async getLowStockAlerts(): Promise<LowStockAlert[]> {
    const rows = await this.db.queryMany<LowStockViewRow>(
      `SELECT * FROM v_medicines_low_stock ORDER BY shortage DESC`,
    );
    return rows.map((row) => this.formatLowStock(row));
  }

  async getExpiringAlerts(): Promise<ExpiringAlert[]> {
    const rows = await this.db.queryMany<ExpiringViewRow>(
      `SELECT * FROM v_medicines_expiring_soon ORDER BY expiry_date ASC`,
    );
    return rows.map((row) => this.formatExpiring(row));
  }

  // ── Formatters ────────────────────────────────────────────────────────────────

  private formatMedicine(row: MedicineRow): Medicine {
    return {
      id: row.id,
      name: row.name,
      category: row.category,
      description: row.description,
      unit: row.unit,
      stockQuantity: row.stock_quantity,
      minStockLevel: row.min_stock_level,
      isLowStock: row.stock_quantity <= row.min_stock_level,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private formatBatch(row: MedicineBatchRow): MedicineBatch {
    const now = new Date();
    const expiry = new Date(row.expiry_date);
    const msPerDay = 86_400_000;
    const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / msPerDay);

    return {
      id: row.id,
      medicineId: row.medicine_id,
      batchNumber: row.batch_number,
      quantity: row.quantity,
      expiryDate: row.expiry_date,
      isExpired: daysLeft <= 0,
      isExpiringSoon: daysLeft > 0 && daysLeft <= EXPIRING_SOON_DAYS,
      createdAt: row.created_at,
    };
  }

  private formatStockLog(row: MedicineStockLogRow): StockLog {
    return {
      id: row.id,
      medicineId: row.medicine_id,
      batchId: row.batch_id,
      action: row.action,
      quantityChange: row.quantity_change,
      notes: row.notes,
      createdAt: row.created_at,
    };
  }

  private formatLowStock(row: LowStockViewRow): LowStockAlert {
    return {
      ...this.formatMedicine(row),
      shortage: row.shortage,
    };
  }

  private formatExpiring(row: ExpiringViewRow): ExpiringAlert {
    return {
      medicineId: row.medicine_id,
      medicineName: row.medicine_name,
      category: row.category,
      batchId: row.batch_id,
      batchNumber: row.batch_number,
      quantity: row.quantity,
      expiryDate: row.expiry_date,
      daysUntilExpiry: Number(row.days_until_expiry),
    };
  }
}
