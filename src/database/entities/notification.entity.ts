import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Template } from './template.entity';
import { DeliveryLog } from './delivery-log.entity';

export type NotificationStatus = 'pending' | 'queued' | 'processing' | 'sent' | 'failed' | 'cancelled';
export type NotificationPriority = 'low' | 'normal' | 'high';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Template, { nullable: true })
  @JoinColumn({ name: 'template_id' })
  template?: Template;

  @Column({ name: 'template_id', type: 'uuid', nullable: true })
  templateId?: string;

  @Column({ type: 'jsonb' })
  recipient: {
    email?: string;
    phone?: string;
    name?: string;
    webhookUrl?: string;
    [key: string]: any;
  };

  @Column({ type: 'jsonb', nullable: true })
  data?: Record<string, any>;

  @Column({ type: 'text', array: true })
  channels: string[];

  @Column({ type: 'varchar', length: 10, default: 'normal' })
  priority: NotificationPriority;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: NotificationStatus;

  @Column({ type: 'timestamp', nullable: true, name: 'scheduled_for' })
  scheduledFor?: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'job_id' })
  jobId?: string;

  @OneToMany(() => DeliveryLog, (log) => log.notification, {
    cascade: true,
  })
  deliveryLogs?: DeliveryLog[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}