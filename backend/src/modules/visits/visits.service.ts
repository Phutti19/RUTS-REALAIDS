import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/db.service';

@Injectable()
export class VisitsService {
  constructor(private readonly db: DatabaseService) {}
  // TODO: implement service methods
}
