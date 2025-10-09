import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

export enum LogType {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  DEBUG = 'debug',
}

export enum LogSource {
  AUTH = 'auth',
  TENANT = 'tenant',
  SCHEDULING = 'scheduling',
  NOTIFICATIONS = 'notifications',
  INTEGRATIONS = 'integrations',
  DOCUMENTS = 'documents',
  COMPLIANCE = 'compliance',
  AUDIT = 'audit',
  SYSTEM = 'system',
}

@Entity('monitoring_logs')
export class MonitoringLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'log_type', type: 'enum', enum: LogType })
  logType: LogType;

  @Column({ name: 'log_source', type: 'enum', enum: LogSource })
  logSource: LogSource;

  @Column({ name: 'tenant_id', nullable: true })
  tenantId: number;

  @Column({ name: 'user_id', nullable: true })
  userId: number;

  @Column({ name: 'message', type: 'text' })
  message: string;

  @Column({ name: 'details', type: 'json', nullable: true })
  details: any;

  @Column({ name: 'ip_address', length: 45, nullable: true })
  ipAddress: string;

  @Column({ name: 'user_agent', length: 500, nullable: true })
  userAgent: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}