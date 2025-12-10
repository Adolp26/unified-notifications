import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Notification } from './notification.entity';

export type DeliveryStatus = 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled';

@Entity('delivery_logs')
export class DeliveryLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Notification, (notification) => notification.deliveryLogs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'notification_id' })
  notification: Notification;

  @Column({ name: 'notification_id', type: 'uuid' })
  notificationId: string;

  @Column({ type: 'varchar', length: 20 })
  channel: string;

  @Column({ type: 'varchar', length: 20 })
  status: DeliveryStatus;

  @Column({ type: 'jsonb', nullable: true })
  response?: {
    messageId?: string;
    provider?: string;
    statusCode?: number;
    [key: string]: any;
  };

  @Column({ type: 'text', nullable: true })
  error?: string;

  @Column({ type: 'int', default: 1 })
  attempt: number;

  @Column({ type: 'int', nullable: true, name: 'duration_ms' })
  durationMs?: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}