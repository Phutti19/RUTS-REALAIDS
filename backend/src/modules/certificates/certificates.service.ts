import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/db.service';

@Injectable()
export class CertificatesService {
  constructor(private readonly db: DatabaseService) {}
  // TODO: implement service methods
}
