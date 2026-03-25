import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EmergencyService } from './emergency.service';

@Injectable()
export class EmergencyCron {
  private readonly logger = new Logger(EmergencyCron.name);

  constructor(private readonly emergencyService: EmergencyService) {}

  /**
   * Every hour, auto-confirm completed incidents older than 24 hours
   * that the reporter hasn't confirmed yet.
   */
  @Cron(CronExpression.EVERY_HOUR, {
    name: 'auto-confirm-completed-incidents',
    timeZone: 'Asia/Bangkok',
  })
  async autoConfirmCompletedIncidents() {
    try {
      const count = await this.emergencyService.autoConfirmStaleIncidents();
      if (count > 0) {
        this.logger.log(`Auto-confirmed ${count} incidents`);
      }
    } catch (err) {
      this.logger.error('Failed to auto-confirm incidents', err);
    }
  }
}
