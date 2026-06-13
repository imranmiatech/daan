import { Module } from '@nestjs/common';
import { AgoraModule } from '../agora/agora.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { StudentLessonsController } from './student-lessons.controller';
import { StudentLessonsService } from './student-lessons.service';

@Module({
  imports: [PrismaModule, AgoraModule],
  controllers: [StudentLessonsController],
  providers: [StudentLessonsService],
})
export class StudentLessonsModule {}
