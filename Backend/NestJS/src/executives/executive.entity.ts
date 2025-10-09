import { Entity, Column, OneToMany } from 'typeorm';
import { BaseTenantEntity } from '../common/entities/base.entity';
import { Meeting } from '../meetings/meeting.entity';

@Entity()
export class Executive extends BaseTenantEntity {
  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column()
  position: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  department: string;

  @OneToMany(() => Meeting, meeting => meeting.executive)
  meetings: Meeting[];
}