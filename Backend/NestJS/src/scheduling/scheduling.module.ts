import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Meeting } from '../meetings/meeting.entity';
import { Executive } from '../executives/executive.entity';
import { SchedulingService } from './scheduling.service';
import { SchedulingController } from './scheduling.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Meeting, Executive]),
  ],
  providers: [SchedulingService],
  controllers: [SchedulingController],
  exports: [SchedulingService],
})
export class SchedulingModule {}