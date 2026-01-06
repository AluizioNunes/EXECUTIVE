import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseTenantEntity } from '../../common/entities/base.entity';
import { PayableConnection } from './payable-connection.entity';
import { Executive } from '../../executives/executive.entity';
import { PayableAccountType } from './payable-account-type.entity';

export enum PayableBillStatus {
  NEW = 'new',
  OPEN = 'open',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELED = 'canceled',
}

@Entity('payable_bills')
@Index(['connectionId', 'remoteId'], { unique: true, where: `"remote_id" IS NOT NULL` })
export class PayableBill extends BaseTenantEntity {
  @Column({ name: 'connection_id' })
  connectionId: number;

  @ManyToOne(() => PayableConnection, (c) => c.bills, { eager: false, nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'connection_id' })
  connection: PayableConnection;

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

  @Column({ name: 'remote_id', length: 255, nullable: true })
  remoteId: string;

  @Column({ length: 255, nullable: true })
  reference: string;

  @Column({ type: 'numeric', precision: 14, scale: 2, nullable: true })
  amount: string;

  @Column({ length: 3, default: 'BRL' })
  currency: string;

  @Column({ name: 'issue_date', type: 'date', nullable: true })
  issueDate: Date;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate: Date;

  @Column({ type: 'enum', enum: PayableBillStatus, default: PayableBillStatus.NEW })
  status: PayableBillStatus;

  @Column({ name: 'fetched_at', type: 'timestamp', nullable: true })
  fetchedAt: Date;

  @Column({ name: 'seen_at', type: 'timestamp', nullable: true })
  seenAt: Date;

  @Column({ name: 'paid_at', type: 'timestamp', nullable: true })
  paidAt: Date;

  @Column({ name: 'attachment_mongo_id', length: 120, nullable: true })
  attachmentMongoId: string;

  @Column({ name: 'attachment_filename', length: 255, nullable: true })
  attachmentFilename: string;

  @Column({ name: 'attachment_mime_type', length: 120, nullable: true })
  attachmentMimeType: string;

  @Column({ name: 'attachment_size', type: 'int', nullable: true })
  attachmentSize: number;

  @Column({ name: 'raw_data', type: 'json', nullable: true })
  rawData: any;
}

