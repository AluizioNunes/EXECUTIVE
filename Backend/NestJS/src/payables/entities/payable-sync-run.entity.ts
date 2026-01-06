import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseTenantEntity } from '../../common/entities/base.entity';
import { PayableConnection } from './payable-connection.entity';

export enum PayableSyncStatus {
  RUNNING = 'running',
  SUCCESS = 'success',
  FAILED = 'failed',
}

@Entity('payable_sync_runs')
export class PayableSyncRun extends BaseTenantEntity {
  @Column({ name: 'connection_id' })
  connectionId: number;

  @ManyToOne(() => PayableConnection, (c) => c.syncRuns, { eager: false, nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'connection_id' })
  connection: PayableConnection;

  @Column({ type: 'enum', enum: PayableSyncStatus, default: PayableSyncStatus.RUNNING })
  status: PayableSyncStatus;

  @Column({ name: 'started_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  startedAt: Date;

  @Column({ name: 'finished_at', type: 'timestamp', nullable: true })
  finishedAt: Date;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  @Column({ name: 'stats', type: 'json', nullable: true })
  stats: any;
}

