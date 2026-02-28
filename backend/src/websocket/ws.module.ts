import { Module, Global } from '@nestjs/common';
import { WsService } from './ws.service';

@Global() // WsService available to all modules that need to broadcast
@Module({
  providers: [WsService],
  exports: [WsService],
})
export class WsModule {}
