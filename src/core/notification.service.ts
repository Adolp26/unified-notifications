import { AppDataSource } from '../config/database.config';
import { Template } from '../database/entities/template.entity';
import { Notification } from '../database/entities/notification.entity';
import { TemplateEngineService } from './template.engine.service';
import { QueueService } from './queue.service';
import { Repository } from 'typeorm';

export interface SendNotificationDTO {
  templateName: string;
  recipient: {
    email?: string;
    phone?: string;
    name?: string;
    [key: string]: any;
  };
  data: Record<string, any>;
  channels?: string[];
  priority?: 'low' | 'normal' | 'high';
  scheduledFor?: Date;
}

export interface ProcessedNotification {
  template: Template;
  recipient: any;
  processedSubject?: string;
  processedBody: string;
  channels: string[];
  priority: string;
  scheduledFor?: Date;
}

export class NotificationService {
  private templateRepository: Repository<Template>;
  private notificationRepository: Repository<Notification>;
  private templateEngine: TemplateEngineService;
  private queueService: QueueService;

  constructor() {
    this.templateRepository = AppDataSource.getRepository(Template);
    this.notificationRepository = AppDataSource.getRepository(Notification);
    this.templateEngine = new TemplateEngineService();
    this.queueService = QueueService.getInstance();
  }

  /**
   * Enfileira notificação para envio assíncrono
   */
  async send(dto: SendNotificationDTO): Promise<{
    id: string;
    jobIds: string[];
    status: string;
    queuedAt: Date;
  }> {
    const validation = await this.validate(dto);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const template = await this.templateRepository.findOne({
      where: { name: dto.templateName },
    });

    if (!template) {
      throw new Error(`Template "${dto.templateName}" not found`);
    }

    const channels = dto.channels || [template.channel];

    const notification = this.notificationRepository.create({
      templateId: template.id,
      recipient: dto.recipient,
      data: dto.data,
      channels,
      priority: dto.priority || 'normal',
      status: dto.scheduledFor ? 'pending' : 'queued',
      scheduledFor: dto.scheduledFor,
      metadata: {
        templateName: dto.templateName,
      },
    });

    const savedNotification = await this.notificationRepository.save(notification);

    const jobIds: string[] = [];

    for (const channel of channels) {
      const jobData = {
        id: savedNotification.id,
        notificationId: savedNotification.id,
        templateName: dto.templateName,
        recipient: dto.recipient,
        data: dto.data,
        channel,
        priority: dto.priority,
      };

      if (dto.scheduledFor) {
        const job = await this.queueService.scheduleNotification(jobData, dto.scheduledFor);
        jobIds.push(job.id.toString());
      } else {
        const job = await this.queueService.addNotification(jobData);
        jobIds.push(job.id.toString());
      }
    }

    savedNotification.jobId = jobIds[0];
    await this.notificationRepository.save(savedNotification);

    return {
      id: savedNotification.id,
      jobIds,
      status: savedNotification.status,
      queuedAt: savedNotification.createdAt,
    };
  }

  /**
   * Busca notificação por ID com logs
   */
  async findById(id: string): Promise<Notification | null> {
    return await this.notificationRepository.findOne({
      where: { id },
      relations: ['template', 'deliveryLogs'],
    });
  }

  /**
   * Lista notificações com filtros
   */
  async findAll(filters: {
    status?: string;
    channel?: string;
    priority?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<Notification[]> {
    const where: any = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.priority) {
      where.priority = filters.priority;
    }

    let qb = this.notificationRepository
      .createQueryBuilder('notification')
      .leftJoinAndSelect('notification.template', 'template')
      .leftJoinAndSelect('notification.deliveryLogs', 'deliveryLogs')
      .orderBy('notification.created_at', 'DESC')
      .take(filters.limit || 50)
      .skip(filters.offset || 0);

    if (filters.status) {
      qb = qb.andWhere('notification.status = :status', { status: filters.status });
    }

    if (filters.priority) {
      qb = qb.andWhere('notification.priority = :priority', { priority: filters.priority });
    }

    if (filters.channel) {
      qb = qb.andWhere(':channel = ANY(notification.channels)', { channel: filters.channel });
    }

    return await qb.getMany();
  }

  /**
   * Atualiza status de uma notificação
   */
  async updateStatus(id: string, status: string): Promise<void> {
    await this.notificationRepository.update(id, { status: status as any });
  }


  async prepare(dto: SendNotificationDTO): Promise<ProcessedNotification> {
    const template = await this.templateRepository.findOne({
      where: { name: dto.templateName },
    });

    if (!template) {
      throw new Error(`Template "${dto.templateName}" not found`);
    }

    const channels = dto.channels || [template.channel];
    if (!channels.includes(template.channel)) {
      throw new Error(
        `Template channel "${template.channel}" not in requested channels`
      );
    }

    const context = {
      ...dto.recipient,
      ...dto.data,
    };

    const missingVars = this.templateEngine.getMissingVariables(
      template.subject,
      template.body,
      context,
      template.variables
    );

    if (missingVars.length > 0) {
      throw new Error(
        `Missing required variables: ${missingVars.join(', ')}`
      );
    }

    const processed = this.templateEngine.processTemplate(
      template.subject,
      template.body,
      context,
      template.variables
    );

    return {
      template,
      recipient: dto.recipient,
      processedSubject: processed.subject,
      processedBody: processed.body,
      channels,
      priority: dto.priority || 'normal',
      scheduledFor: dto.scheduledFor,
    };
  }

  async validate(dto: SendNotificationDTO): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    const template = await this.templateRepository.findOne({
      where: { name: dto.templateName },
    });

    if (!template) {
      errors.push(`Template "${dto.templateName}" not found`);
      return { valid: false, errors };
    }

    const channels = dto.channels || [template.channel];
    if (channels.includes('email') && !dto.recipient.email) {
      errors.push('Email channel requires recipient.email');
    }
    if (channels.includes('sms') && !dto.recipient.phone) {
      errors.push('SMS channel requires recipient.phone');
    }

    const context = { ...dto.recipient, ...dto.data };
    const missingVars = this.templateEngine.getMissingVariables(
      template.subject,
      template.body,
      context,
      template.variables
    );

    if (missingVars.length > 0) {
      errors.push(`Missing variables: ${missingVars.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}