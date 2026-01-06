import { Entity, Column, Index } from 'typeorm';
import { BaseTenantEntity } from '../../common/entities/base.entity';

@Entity('payable_account_types')
@Index(['tenant', 'name'], { unique: true })
export class PayableAccountType extends BaseTenantEntity {
  @Column({ length: 120 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;
}

