import { Module } from '@nestjs/common';
import { AgoraModule } from '../agora/agora.module';
import { ClassesController } from './classes.controller';
import { ClassesService } from './classes.service';

@Module({
  imports: [AgoraModule],
  controllers: [ClassesController],
  providers: [ClassesService],
})
export class ClassesModule {}
