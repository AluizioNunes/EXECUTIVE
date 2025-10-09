import { Entity, Column, ManyToOne } from 'typeorm';
import { BaseTenantEntity } from '../common/entities/base.entity';
import { User } from '../auth/user.entity';
import { Meeting } from '../meetings/meeting.entity';

export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  REVIEW = 'review',
  DONE = 'done',
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

@Entity()
export class Task extends BaseTenantEntity {
  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.TODO,
  })
  status: TaskStatus;

  @Column({
    type: 'enum',
    enum: TaskPriority,
    default: TaskPriority.MEDIUM,
  })
  priority: TaskPriority;

  @Column({ type: 'timestamp', nullable: true })
  dueDate: Date;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  estimatedHours: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  actualHours: number;

  @ManyToOne(() => User, { nullable: true, eager: true })
  assignee: User;

  @ManyToOne(() => User, { eager: true })
  createdBy: User;

  @ManyToOne(() => Meeting, meeting => meeting.tasks, { nullable: true })
  meeting: Meeting;
}