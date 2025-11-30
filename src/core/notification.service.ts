import { AppDataSource } from '../config/database.config';
import { Template } from '../database/entities/template.entity';
import { TemplateEngineService } from './template.engine.service';
import { Repository } from 'typeorm';
import { QueueService } from './queue.service';

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
  private templateEngine: TemplateEngineService;
  private queueService: QueueService;

  constructor() {
    this.templateRepository = AppDataSource.getRepository(Template);
    this.templateEngine = new TemplateEngineService();
    this.queueService = QueueService.getInstance();
  }

  async prepare(dto: SendNotificationDTO): Promise<ProcessedNotification> {
    const template = await this.templateRepository.findOne({
      where: { name: dto.templateName },
    });

    if (!template) throw new Error(`Template "${dto.templateName}" not found`);

    const channels = dto.channels || [template.channel];

    if (!channels.includes(template.channel)) {
      throw new Error(
        `Template channel "${template.channel}" not in requested channels`
      );
    }

    const context = { ...dto.recipient, ...dto.data };

    const missingVars = this.templateEngine.getMissingVariables(
      template.subject,
      template.body,
      context,
      template.variables
    );

    if (missingVars.length > 0) {
      throw new Error(`Missing required variables: ${missingVars.join(', ')}`);
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

  async validate(dto: SendNotificationDTO) {
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


  async send(dto: SendNotificationDTO): Promise<{
    jobId: string;
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

    // Útil para gerar IDs únicos
    const generateId = () =>
      `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

    let jobs;

    // Se for agendado, usa scheduleNotification
    if (dto.scheduledFor) {
      jobs = await Promise.all(
        channels.map((channel) =>
          this.queueService.scheduleNotification(
            {
              id: generateId(),
              templateName: dto.templateName,
              recipient: dto.recipient,
              data: dto.data,
              channel,
              priority: dto.priority,
            },
            dto.scheduledFor!
          )
        )
      );

      return {
        jobId: jobs[0].id.toString(),
        status: 'scheduled',
        queuedAt: new Date(),
      };
    }

    // Caso normal, addNotification
    jobs = await Promise.all(
      channels.map((channel) =>
        this.queueService.addNotification({
          id: generateId(),
          templateName: dto.templateName,
          recipient: dto.recipient,
          data: dto.data,
          channel,
          priority: dto.priority,
        })
      )
    );

    return {
      jobId: jobs[0].id.toString(),
      status: 'queued',
      queuedAt: new Date(),
    };
  }
}
