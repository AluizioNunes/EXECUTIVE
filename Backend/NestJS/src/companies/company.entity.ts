import { Entity, Column, OneToMany, ManyToOne, Tree, TreeChildren, TreeParent } from 'typeorm';
import { BaseTenantEntity } from '../common/entities/base.entity';
import { User } from '../auth/user.entity';

export enum CompanyType {
  HEADQUARTER = 'headquarter',
  BRANCH = 'branch',
  DEPARTMENT = 'department',
  DIVISION = 'division',
}

@Entity()
@Tree('materialized-path')
export class Company extends BaseTenantEntity {
  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: CompanyType,
    default: CompanyType.HEADQUARTER,
  })
  type: CompanyType;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  website: string;

  @TreeChildren()
  children: Company[];

  @TreeParent()
  parent: Company;

  @OneToMany(() => User, user => user.company)
  employees: User[];
}