import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { AgoraModule } from '../agora/agora.module';

@Module({
  imports: [AgoraModule],
  controllers: [PaymentController],
  providers: [PaymentService],
})
export class PaymentModule {}
