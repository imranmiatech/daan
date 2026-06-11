import { Module } from '@nestjs/common';
import { AdminDashboardController } from './admindashboard.controller';
import { AdminDashboardService } from './admindashboard.service';

@Module({
  controllers: [AdminDashboardController],
  providers: [AdminDashboardService],
})
export class AdminDashboardModule {}
