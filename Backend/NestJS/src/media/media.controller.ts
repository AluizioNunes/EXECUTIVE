import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { MediaGridFsService } from './media-gridfs.service';

type UploadResponse = {
  id: string;
  filename: string;
  mimeType?: string | null;
  length?: number;
};

@Controller('media')
export class MediaController {
  constructor(private readonly mediaGridFsService: MediaGridFsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } }))
  async upload(@UploadedFile() file: Express.Multer.File): Promise<UploadResponse> {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const id = await this.mediaGridFsService.uploadBuffer({
      filename: file.originalname,
      mimeType: file.mimetype,
      buffer: file.buffer,
    });

    const info = await this.mediaGridFsService.findFileInfo(id);
    return {
      id,
      filename: info?.filename || file.originalname,
      mimeType: info?.mimeType || file.mimetype,
      length: info?.length || file.size,
    };
  }

  @Post('fetch')
  async fetchFromUrl(@Body() body: { url?: string; filename?: string }): Promise<UploadResponse> {
    const url = String(body?.url || '').trim();
    if (!url) {
      throw new BadRequestException('url is required');
    }

    const resp = await fetch(url);
    if (!resp.ok) {
      throw new BadRequestException('Failed to fetch media from url');
    }

    const contentLength = resp.headers.get('content-length');
    if (contentLength && Number(contentLength) > 100 * 1024 * 1024) {
      throw new BadRequestException('File is too large');
    }

    const contentType = resp.headers.get('content-type') || undefined;
    const filename = String(body?.filename || '').trim() || this.guessFilenameFromUrl(url) || 'media';

    const arr = await resp.arrayBuffer();
    const buffer = Buffer.from(arr);
    if (buffer.length > 100 * 1024 * 1024) {
      throw new BadRequestException('File is too large');
    }

    const id = await this.mediaGridFsService.uploadBuffer({
      filename,
      mimeType: contentType,
      buffer,
      metadata: { sourceUrl: url },
    });

    const info = await this.mediaGridFsService.findFileInfo(id);
    return {
      id,
      filename: info?.filename || filename,
      mimeType: info?.mimeType || contentType,
      length: info?.length || buffer.length,
    };
  }

  @Get(':id')
  async download(@Param('id') id: string, @Res() res: any) {
    const info = await this.mediaGridFsService.findFileInfo(id);
    if (!info) {
      res.status(404).send('Not found');
      return;
    }

    res.setHeader('Content-Type', info.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${info.filename}"`);
    res.setHeader('Content-Length', String(info.length));

    const stream = this.mediaGridFsService.openDownloadStream(id);
    stream.on('error', () => {
      if (!res.headersSent) res.status(404).send('Not found');
      else res.end();
    });
    stream.pipe(res);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.mediaGridFsService.deleteFile(id);
    return { ok: true };
  }

  private guessFilenameFromUrl(url: string) {
    try {
      const u = new URL(url);
      const path = u.pathname || '';
      const last = path.split('/').filter(Boolean).pop();
      return last || null;
    } catch {
      return null;
    }
  }
}

