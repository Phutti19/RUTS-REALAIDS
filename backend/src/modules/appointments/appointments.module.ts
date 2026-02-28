import { Module } from '@nestjs/common';
import { AppointmentsController } from './appointments.controller';
import { AppointmentSlotsController } from './appointment-slots.controller';
import { AppointmentsService } from './appointments.service';

@Module({
  controllers: [AppointmentsController, AppointmentSlotsController],
  providers: [AppointmentsService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
