import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';

import { SettingsService } from './settings.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateEmergencyContactDto } from './dto/create-emergency-contact.dto';
import { UpdateEmergencyContactDto } from './dto/update-emergency-contact.dto';

@Controller('emergency-contacts')
@UseGuards(AuthGuard, RolesGuard)
@Roles('staff', 'admin')
export class EmergencyContactsController {
  constructor(private readonly settingsService: SettingsService) {}

  /**
   * GET /api/v1/emergency-contacts
   * List all emergency contacts ordered by category then name.
   * Students can also read emergency contacts (read-only).
   */
  @Get()
  @Roles('student', 'staff', 'admin')
  async listContacts() {
    const data = await this.settingsService.listContacts();
    return { success: true, data };
  }

  /**
   * POST /api/v1/emergency-contacts
   * Create a new emergency contact entry.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createContact(@Body() dto: CreateEmergencyContactDto) {
    const data = await this.settingsService.createContact(dto);
    return { success: true, data };
  }

  /**
   * PUT /api/v1/emergency-contacts/:id
   * Update an emergency contact. Only provided fields are changed.
   */
  @Put(':id')
  async updateContact(
    @Param('id') id: string,
    @Body() dto: UpdateEmergencyContactDto,
  ) {
    const data = await this.settingsService.updateContact(id, dto);
    return { success: true, data };
  }

  /**
   * DELETE /api/v1/emergency-contacts/:id
   * Permanently delete an emergency contact.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteContact(@Param('id') id: string) {
    await this.settingsService.deleteContact(id);
  }
}
