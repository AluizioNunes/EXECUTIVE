import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Db, GridFSBucket, MongoClient, ObjectId } from 'mongodb';

export type MediaFileInfo = {
  id: string;
  filename: string;
  length: number;
  uploadDate?: Date;
  mimeType?: string | null;
};

@Injectable()
export class MediaGridFsService implements OnModuleInit, OnModuleDestroy {
  private client: MongoClient;
  private db: Db;
  private bucket: GridFSBucket;

  async onModuleInit() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI is required');
    }

    this.client = new MongoClient(uri);
    await this.client.connect();
    this.db = this.client.db();
    this.bucket = new GridFSBucket(this.db, { bucketName: 'media' });
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.close();
    }
  }

  async uploadBuffer(params: { filename: string; mimeType?: string; buffer: Buffer; metadata?: Record<string, any> }): Promise<string> {
    const uploadStream = this.bucket.openUploadStream(params.filename, {
      metadata: {
        ...(params.metadata || {}),
        mimeType: params.mimeType,
      },
    });

    await new Promise<void>((resolve, reject) => {
      uploadStream.on('finish', () => resolve());
      uploadStream.on('error', (err) => reject(err));
      uploadStream.end(params.buffer);
    });

    return uploadStream.id.toString();
  }

  async findFileInfo(fileId: string): Promise<MediaFileInfo | null> {
    const _id = new ObjectId(fileId);
    const doc = await this.bucket.find({ _id }).next();
    if (!doc) return null;
    return {
      id: doc._id.toString(),
      filename: doc.filename,
      length: doc.length,
      uploadDate: doc.uploadDate,
      mimeType: (doc.metadata as any)?.mimeType ?? null,
    };
  }

  openDownloadStream(fileId: string) {
    return this.bucket.openDownloadStream(new ObjectId(fileId));
  }

  async deleteFile(fileId: string): Promise<void> {
    await this.bucket.delete(new ObjectId(fileId));
  }
}

