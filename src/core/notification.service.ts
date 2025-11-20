import { AppDataSource } from '../config/database.config';
import { Template } from '../database/entities/template.entity';
import { TemplateEngineService } from './template.engine.service';
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
  private templateEngine: TemplateEngineService;

  constructor() {
    this.templateRepository = AppDataSource.getRepository(Template);
    this.templateEngine = new TemplateEngineService();
  }

  /**
   * Prepara uma notificação para envio
   */
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

  /**
   * Valida se uma notificação pode ser enviada
   */
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
