import { Module, Global } from '@nestjs/common';
import { DatabaseService } from './db.service';

@Global() // Make DatabaseService available project-wide without re-importing
@Module({
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
