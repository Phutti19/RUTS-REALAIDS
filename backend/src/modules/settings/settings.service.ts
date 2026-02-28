import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/db.service';

@Injectable()
export class SettingsService {
  constructor(private readonly db: DatabaseService) {}
  // TODO: implement service methods
}
