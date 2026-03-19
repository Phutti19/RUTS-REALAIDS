import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AppointmentsService } from './appointments.service';

@Injectable()
export class AppointmentsCron {
  private readonly logger = new Logger(AppointmentsCron.name);

  constructor(private readonly appointmentsService: AppointmentsService) {}

  /**
   * Runs every day at midnight (Asia/Bangkok).
   * Marks all past 'scheduled' appointments as 'no_show'.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    timeZone: 'Asia/Bangkok',
  })
  async handleAutoNoShow(): Promise<void> {
    const count = await this.appointmentsService.autoNoShowPastAppointments();
    if (count > 0) {
      this.logger.log(`Auto no-show: marked ${count} past appointment(s) as no_show`);
    }
  }
}
