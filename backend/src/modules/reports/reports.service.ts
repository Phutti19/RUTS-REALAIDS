import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/db.service';

@Injectable()
export class ReportsService {
  constructor(private readonly db: DatabaseService) {}
  // TODO: implement service methods
}
