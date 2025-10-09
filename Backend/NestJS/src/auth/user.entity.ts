import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, ManyToMany, JoinTable } from 'typeorm';
import { Tenant } from '../tenants/tenant.entity';
import { Role } from './role.entity';
import { Company } from '../companies/company.entity';

export enum UserRole {
  ADMIN = 'admin',
  SECRETARY = 'secretary',
  EXECUTIVE = 'executive',
  MANAGER = 'manager',
}

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.SECRETARY,
  })
  role: UserRole;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Tenant, tenant => tenant.users, { eager: true })
  @JoinColumn()
  tenant: Tenant;

  @ManyToMany(() => Role, role => role.users)
  @JoinTable()
  roles: Role[];

  @ManyToOne(() => Company, company => company.employees, { nullable: true })
  company: Company;
}