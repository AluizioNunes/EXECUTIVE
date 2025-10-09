import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MonitoringController } from './monitoring.controller';
import { MonitoringService } from './monitoring.service';
import { MonitoringLog } from './monitoring-log.entity';
import { MonitoringInterceptor } from './monitoring.interceptor';

@Module({
  imports: [TypeOrmModule.forFeature([MonitoringLog])],
  controllers: [MonitoringController],
  providers: [MonitoringService, MonitoringInterceptor],
  exports: [MonitoringService, MonitoringInterceptor],
})
export class MonitoringModule {}