import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { PayableConnection } from './payable-connection.entity';

@Entity('payable_credentials')
@Index(['connectionId'], { unique: true })
export class PayableCredential {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'connection_id' })
  connectionId: number;

  @OneToOne(() => PayableConnection, (c) => c.credential, { eager: false, nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'connection_id' })
  connection: PayableConnection;

  @Column({ name: 'encrypted_payload', type: 'text' })
  encryptedPayload: string;

  @Column({ name: 'payload_version', default: 1 })
  payloadVersion: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

