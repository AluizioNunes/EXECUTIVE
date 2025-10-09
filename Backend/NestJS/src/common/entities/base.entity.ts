import { BaseEntity, Column, CreateDateColumn, UpdateDateColumn, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Tenant } from '../../tenants/tenant.entity';

export abstract class BaseTenantEntity extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Tenant, { eager: true, nullable: false })
  @JoinColumn()
  tenant: Tenant;
}