import { Entity, Column } from 'typeorm';
import { BaseTenantEntity } from '../../common/entities/base.entity';

@Entity('payable_settings')
export class PayableSettings extends BaseTenantEntity {
  @Column({ name: 'due_soon_days', type: 'int', default: 7 })
  dueSoonDays: number;

  @Column({ name: 'sync_enabled', default: true })
  syncEnabled: boolean;

  @Column({ name: 'alerts_enabled', default: true })
  alertsEnabled: boolean;
}

