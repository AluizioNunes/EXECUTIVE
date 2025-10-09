import { Entity, Column, ManyToOne, ManyToMany, JoinTable, OneToMany } from 'typeorm';
import { BaseTenantEntity } from '../common/entities/base.entity';
import { Executive } from '../executives/executive.entity';
import { User } from '../auth/user.entity';
import { Task } from '../tasks/task.entity';

export enum MeetingPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export enum MeetingStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity()
export class Meeting extends BaseTenantEntity {
  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'timestamp' })
  startTime: Date;

  @Column({ type: 'timestamp' })
  endTime: Date;

  @Column({ nullable: true })
  location: string;

  @Column({
    type: 'enum',
    enum: MeetingPriority,
    default: MeetingPriority.MEDIUM,
  })
  priority: MeetingPriority;

  @Column({
    type: 'enum',
    enum: MeetingStatus,
    default: MeetingStatus.SCHEDULED,
  })
  status: MeetingStatus;

  @ManyToOne(() => Executive, executive => executive.meetings, { eager: true })
  executive: Executive;

  @ManyToOne(() => User, user => user.id, { eager: true })
  organizer: User;

  @ManyToMany(() => User)
  @JoinTable()
  attendees: User[];

  @OneToMany(() => Task, task => task.meeting)
  tasks: Task[];
}