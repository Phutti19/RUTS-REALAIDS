import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';

import { MedicinesService } from './medicines.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateMedicineDto } from './dto/create-medicine.dto';
import { UpdateMedicineDto } from './dto/update-medicine.dto';
import { ListMedicinesDto } from './dto/list-medicines.dto';
import { AddBatchDto } from './dto/add-batch.dto';
import { ListStockLogsDto } from './dto/list-stock-logs.dto';

@Controller('medicines')
@UseGuards(AuthGuard, RolesGuard)
@Roles('staff', 'admin')
export class MedicinesController {
  constructor(private readonly medicinesService: MedicinesService) {}

  // ── Alert endpoints — defined BEFORE :id to prevent route conflict ────────────

  /**
   * GET /api/v1/medicines/alerts/low-stock
   * Returns medicines whose stock_quantity <= min_stock_level (from view).
   * Sorted by shortage (largest first).
   */
  @Get('alerts/low-stock')
  async getLowStockAlerts() {
    const data = await this.medicinesService.getLowStockAlerts();
    return { success: true, data };
  }

  /**
   * GET /api/v1/medicines/alerts/expiring
   * Returns medicine batches expiring within 30 days (from view).
   * Sorted by expiry_date ASC (soonest first).
   */
  @Get('alerts/expiring')
  async getExpiringAlerts() {
    const data = await this.medicinesService.getExpiringAlerts();
    return { success: true, data };
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────────

  /**
   * POST /api/v1/medicines
   * Create a new medicine entry. Stock starts at 0; add batches to increase it.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createMedicine(@Body() dto: CreateMedicineDto) {
    const data = await this.medicinesService.createMedicine(dto);
    return { success: true, data };
  }

  /**
   * GET /api/v1/medicines
   * Paginated list of all medicines.
   * Query params: page, limit, category, search, sortBy, order
   */
  @Get()
  async listMedicines(@Query() query: ListMedicinesDto) {
    const result = await this.medicinesService.listMedicines(query);
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
   * GET /api/v1/medicines/:id
   * Single medicine detail with live isLowStock flag.
   */
  @Get(':id')
  async getMedicineById(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.medicinesService.getMedicineById(id);
    return { success: true, data };
  }

  /**
   * PATCH /api/v1/medicines/:id
   * Update medicine metadata (name, category, description, unit, minStockLevel).
   * Does NOT directly modify stock_quantity — use batch endpoints for that.
   */
  @Patch(':id')
  async updateMedicine(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMedicineDto,
  ) {
    const data = await this.medicinesService.updateMedicine(id, dto);
    return { success: true, data };
  }

  /**
   * DELETE /api/v1/medicines/:id
   * Hard delete — fails with 409 if the medicine has been dispensed in any patient visit.
   * Also removes all batches and stock logs for this medicine.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMedicine(@Param('id', ParseUUIDPipe) id: string) {
    await this.medicinesService.deleteMedicine(id);
  }

  // ── Batch endpoints ───────────────────────────────────────────────────────────

  /**
   * POST /api/v1/medicines/:id/batches
   * Add a new stock batch. Atomically increases stock_quantity and logs the receipt.
   */
  @Post(':id/batches')
  @HttpCode(HttpStatus.CREATED)
  async addBatch(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddBatchDto,
  ) {
    const data = await this.medicinesService.addBatch(id, dto);
    return { success: true, data };
  }

  /**
   * GET /api/v1/medicines/:id/batches
   * All batches for a medicine, sorted by expiry_date ASC (FIFO order).
   * Each batch shows isExpired and isExpiringSoon (≤30 days) flags.
   */
  @Get(':id/batches')
  async getBatches(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.medicinesService.getBatches(id);
    return { success: true, data };
  }

  // ── Stock log endpoint ────────────────────────────────────────────────────────

  /**
   * GET /api/v1/medicines/:id/stock-logs
   * Paginated movement history for a medicine.
   * Query params: page, limit, action (received|dispensed|expired|adjusted), from, to
   */
  @Get(':id/stock-logs')
  async getStockLogs(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ListStockLogsDto,
  ) {
    const result = await this.medicinesService.getStockLogs(id, query);
    return {
      success: true,
      data: result.data,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }
}
