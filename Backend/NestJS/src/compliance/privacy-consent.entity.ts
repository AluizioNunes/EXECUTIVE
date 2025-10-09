import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../auth/user.entity';
import { Tenant } from '../tenants/tenant.entity';

export enum ConsentType {
  PRIVACY_POLICY = 'privacy_policy',
  TERMS_OF_SERVICE = 'terms_of_service',
  DATA_PROCESSING = 'data_processing',
  MARKETING = 'marketing',
  THIRD_PARTY_SHARING = 'third_party_sharing',
}

export enum ConsentStatus {
  GRANTED = 'granted',
  REVOKED = 'revoked',
  EXPIRED = 'expired',
}

@Entity('privacy_consents')
export class PrivacyConsent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'consent_type', type: 'enum', enum: ConsentType })
  consentType: ConsentType;

  @Column({ name: 'consent_status', type: 'enum', enum: ConsentStatus, default: ConsentStatus.GRANTED })
  consentStatus: ConsentStatus;

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

  @Column({ name: 'consent_version', length: 50 })
  consentVersion: string;

  @Column({ name: 'ip_address', length: 45, nullable: true })
  ipAddress: string;

  @Column({ name: 'user_agent', length: 500, nullable: true })
  userAgent: string;

  @Column({ name: 'consent_details', type: 'json', nullable: true })
  consentDetails: any;

  @CreateDateColumn({ name: 'consented_at' })
  consentedAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'revoked_at', nullable: true })
  revokedAt: Date;
}