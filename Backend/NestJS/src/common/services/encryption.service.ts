import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto-js';

@Injectable()
export class EncryptionService {
  private readonly secretKey = process.env.ENCRYPTION_SECRET_KEY || 'default-secret-key-change-in-production';

  // Encrypt data
  encrypt(data: string): string {
    try {
      return crypto.AES.encrypt(data, this.secretKey).toString();
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  // Decrypt data
  decrypt(encryptedData: string): string {
    try {
      const bytes = crypto.AES.decrypt(encryptedData, this.secretKey);
      return bytes.toString(crypto.enc.Utf8);
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  // Hash data (for passwords, etc.)
  hash(data: string): string {
    return crypto.SHA256(data).toString();
  }
}