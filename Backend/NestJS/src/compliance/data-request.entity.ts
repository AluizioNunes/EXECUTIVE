import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../auth/user.entity';
import { Tenant } from '../tenants/tenant.entity';

export enum DataRequestType {
  ACCESS = 'access',
  RECTIFICATION = 'rectification',
  ERASURE = 'erasure',
  RESTRICTION = 'restriction',
  PORTABILITY = 'portability',
  OBJECTION = 'objection',
}

export enum DataRequestStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  REJECTED = 'rejected',
}

@Entity('data_requests')
export class DataRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'request_type', type: 'enum', enum: DataRequestType })
  requestType: DataRequestType;

  @Column({ name: 'request_status', type: 'enum', enum: DataRequestStatus, default: DataRequestStatus.PENDING })
  requestStatus: DataRequestStatus;

  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'tenant_id' })
  tenantId: number;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'request_details', type: 'text' })
  requestDetails: string;

  @Column({ name: 'justification', type: 'text', nullable: true })
  justification: string;

  @Column({ name: 'ip_address', length: 45, nullable: true })
  ipAddress: string;

  @Column({ name: 'user_agent', length: 500, nullable: true })
  userAgent: string;

  @CreateDateColumn({ name: 'requested_at' })
  requestedAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'processed_at', nullable: true })
  processedAt: Date;

  @Column({ name: 'processed_by', nullable: true })
  processedBy: number;
}