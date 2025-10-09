import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Meeting } from './meeting.entity';
import { MeetingsService } from './meetings.service';
import { MeetingsController } from './meetings.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Meeting])],
  providers: [MeetingsService],
  controllers: [MeetingsController],
  exports: [MeetingsService],
})
export class MeetingsModule {}