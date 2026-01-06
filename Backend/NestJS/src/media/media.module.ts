import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaGridFsService } from './media-gridfs.service';

@Module({
  controllers: [MediaController],
  providers: [MediaGridFsService],
  exports: [MediaGridFsService],
})
export class MediaModule {}

