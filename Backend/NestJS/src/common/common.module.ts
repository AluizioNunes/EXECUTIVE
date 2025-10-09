import { Module } from '@nestjs/common';
import { EncryptionService } from './services/encryption.service';
import { EncryptedFieldSubscriber } from './decorators/encrypted-field.decorator';

@Module({
  providers: [EncryptionService, EncryptedFieldSubscriber],
  exports: [EncryptionService],
})
export class CommonModule {}