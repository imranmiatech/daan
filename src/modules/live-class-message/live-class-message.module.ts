import { Module } from '@nestjs/common';
import { CloudinaryModule } from '../common/cloudinary/cloudinary.module';
import { LiveClassMessageController } from './live-class-message.controller';
import { LiveClassMessageGateway } from './live-class-message.gateway';
import { LiveClassMessageService } from './live-class-message.service';

@Module({
  imports: [CloudinaryModule],
  controllers: [LiveClassMessageController],
  providers: [LiveClassMessageService, LiveClassMessageGateway],
  exports: [LiveClassMessageService, LiveClassMessageGateway],
})
export class LiveClassMessageModule {}
