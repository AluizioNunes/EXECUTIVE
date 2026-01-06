import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseTenantEntity } from '../../common/entities/base.entity';
import { Executive } from '../../executives/executive.entity';
import { PayableBill } from './payable-bill.entity';

export enum PayableAlertType {
  NEW_BILL = 'new_bill',
  DUE_SOON = 'due_soon',
  OVERDUE = 'overdue',
}

@Entity('payable_alerts')
@Index(['billId', 'type'], { unique: true })
export class PayableAlert extends BaseTenantEntity {
  @Column({ name: 'executive_id' })
  executiveId: number;

  @ManyToOne(() => Executive, { eager: false, nullable: false })
  @JoinColumn({ name: 'executive_id' })
  executive: Executive;

  @Column({ name: 'bill_id', nullable: true })
  billId: number;

  @ManyToOne(() => PayableBill, { eager: true, nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bill_id' })
  bill: PayableBill;

  @Column({ type: 'enum', enum: PayableAlertType })
  type: PayableAlertType;

  @Column({ length: 200 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate: Date;

  @Column({ name: 'acknowledged_at', type: 'timestamp', nullable: true })
  acknowledgedAt: Date;
}

