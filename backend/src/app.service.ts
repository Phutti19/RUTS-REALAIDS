import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      success: true,
      message: 'RUTS-REALAIDS API is running',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
    };
  }
}
