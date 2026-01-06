import { Entity, Column, ManyToOne, JoinColumn, OneToMany, OneToOne, Index } from 'typeorm';
import { BaseTenantEntity } from '../../common/entities/base.entity';
import { Executive } from '../../executives/executive.entity';
import { PayableAccountType } from './payable-account-type.entity';
import { PayableCredential } from './payable-credential.entity';
import { PayableBill } from './payable-bill.entity';
import { PayableSyncRun } from './payable-sync-run.entity';

export enum PayableAutomationMode {
  MANUAL = 'manual',
  PLAYWRIGHT = 'playwright',
}

@Entity('payable_connections')
@Index(['tenant', 'executiveId'])
export class PayableConnection extends BaseTenantEntity {
  @Column({ name: 'executive_id' })
  executiveId: number;

  @ManyToOne(() => Executive, { eager: false, nullable: false })
  @JoinColumn({ name: 'executive_id' })
  executive: Executive;

  @Column({ name: 'account_type_id' })
  accountTypeId: number;

  @ManyToOne(() => PayableAccountType, { eager: true, nullable: false })
  @JoinColumn({ name: 'account_type_id' })
  accountType: PayableAccountType;

  @Column({ length: 180 })
  name: string;

  @Column({ name: 'portal_url', length: 1000, nullable: true })
  portalUrl: string;

  @Column({ name: 'login_url', length: 1000, nullable: true })
  loginUrl: string;

  @Column({ type: 'enum', enum: PayableAutomationMode, default: PayableAutomationMode.MANUAL })
  mode: PayableAutomationMode;

  @Column({ type: 'json', nullable: true })
  config: any;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'last_synced_at', type: 'timestamp', nullable: true })
  lastSyncedAt: Date;

  @OneToOne(() => PayableCredential, (c) => c.connection, { cascade: true })
  credential: PayableCredential;

  @OneToMany(() => PayableBill, (b) => b.connection)
  bills: PayableBill[];

  @OneToMany(() => PayableSyncRun, (r) => r.connection)
  syncRuns: PayableSyncRun[];
}

