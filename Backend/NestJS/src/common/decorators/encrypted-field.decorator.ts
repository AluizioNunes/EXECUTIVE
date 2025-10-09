import { EntitySubscriberInterface, EventSubscriber, InsertEvent, UpdateEvent, LoadEvent } from 'typeorm';
import { EncryptionService } from '../services/encryption.service';
import { Injectable } from '@nestjs/common';

// Lista de campos que devem ser criptografados
const ENCRYPTED_FIELDS = [
  'email',
  'phone',
  'address',
];

@Injectable()
@EventSubscriber()
export class EncryptedFieldSubscriber implements EntitySubscriberInterface {
  constructor(private readonly encryptionService: EncryptionService) {}

  /**
   * Antes de inserir, criptografa os campos sensíveis
   */
  beforeInsert(event: InsertEvent<any>) {
    this.encryptFields(event.entity);
  }

  /**
   * Antes de atualizar, criptografa os campos sensíveis
   */
  beforeUpdate(event: UpdateEvent<any>) {
    this.encryptFields(event.entity);
  }

  /**
   * Após carregar, descriptografa os campos sensíveis
   */
  afterLoad(entity: any) {
    this.decryptFields(entity);
  }

  /**
   * Criptografa campos sensíveis
   */
  private encryptFields(entity: any) {
    if (!entity) return;

    for (const field of ENCRYPTED_FIELDS) {
      if (entity[field] && typeof entity[field] === 'string') {
        try {
          entity[field] = this.encryptionService.encrypt(entity[field]);
        } catch (error) {
          console.error(`Failed to encrypt field ${field}:`, error);
        }
      }
    }
  }

  /**
   * Descriptografa campos sensíveis
   */
  private decryptFields(entity: any) {
    if (!entity) return;

    for (const field of ENCRYPTED_FIELDS) {
      if (entity[field] && typeof entity[field] === 'string') {
        try {
          entity[field] = this.encryptionService.decrypt(entity[field]);
        } catch (error) {
          console.error(`Failed to decrypt field ${field}:`, error);
        }
      }
    }
  }
}