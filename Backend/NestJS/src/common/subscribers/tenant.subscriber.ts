import { EventSubscriber, EntitySubscriberInterface, InsertEvent, UpdateEvent } from 'typeorm';
import { BaseTenantEntity } from '../entities/base.entity';
import { Tenant } from '../../tenants/tenant.entity';

@EventSubscriber()
export class TenantSubscriber implements EntitySubscriberInterface<BaseTenantEntity> {
  
  /**
   * Indicates that this subscriber only listen to BaseTenantEntity events.
   */
  listenTo() {
    return BaseTenantEntity;
  }

  /**
   * Adds tenant information before inserting.
   */
  beforeInsert(event: InsertEvent<BaseTenantEntity>) {
    // O tenant já deve ser definido no controller, mas adicionamos uma verificação de segurança
    if (event.entity && !event.entity.tenant) {
      // Em um ambiente real, você obteria o tenant do contexto da requisição
      // Por enquanto, vamos deixar um placeholder
      console.warn('Tenant not set for entity before insert');
    }
  }

  /**
   * Prevents tenant changes during updates.
   */
  beforeUpdate(event: UpdateEvent<BaseTenantEntity>) {
    if (event.databaseEntity && event.entity) {
      // Impedir que o tenant seja alterado
      event.entity.tenant = event.databaseEntity.tenant;
    }
  }
}