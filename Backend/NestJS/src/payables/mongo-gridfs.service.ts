import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Db, GridFSBucket, MongoClient, ObjectId } from 'mongodb';

@Injectable()
export class MongoGridFsService implements OnModuleInit, OnModuleDestroy {
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
    this.bucket = new GridFSBucket(this.db, { bucketName: 'payables' });
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.close();
    }
  }

  async uploadBuffer(params: { filename: string; mimeType?: string; buffer: Buffer }): Promise<string> {
    const uploadStream = this.bucket.openUploadStream(params.filename, {
      metadata: {
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

  openDownloadStream(fileId: string) {
    return this.bucket.openDownloadStream(new ObjectId(fileId));
  }

  async deleteFile(fileId: string): Promise<void> {
    await this.bucket.delete(new ObjectId(fileId));
  }
}

