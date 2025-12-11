import { AppDataSource } from '../config/database.config';
import { DeliveryLog, DeliveryStatus } from '../database/entities/delivery-log.entity';
import { Notification } from '../database/entities/notification.entity';
import { Repository, Between, FindOptionsWhere } from 'typeorm';

export interface CreateDeliveryLogDTO {
  notificationId: string;
  channel: string;
  status: DeliveryStatus;
  response?: any;
  error?: string;
  attempt: number;
  durationMs?: number;
  metadata?: Record<string, any>;
}

export interface DeliveryLogFilters {
  notificationId?: string;
  channel?: string;
  status?: DeliveryStatus;
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
}

export class DeliveryLogService {
  private deliveryLogRepository: Repository<DeliveryLog>;
  private notificationRepository: Repository<Notification>;

  constructor() {
    this.deliveryLogRepository = AppDataSource.getRepository(DeliveryLog);
    this.notificationRepository = AppDataSource.getRepository(Notification);
  }

  /**
   * Cria um log de entrega
   */
  async create(dto: CreateDeliveryLogDTO): Promise<DeliveryLog> {
    const log = this.deliveryLogRepository.create(dto);
    return await this.deliveryLogRepository.save(log);
  }

  /**
   * Busca logs por filtros
   */
  async findAll(filters: DeliveryLogFilters = {}): Promise<DeliveryLog[]> {
    const where: FindOptionsWhere<DeliveryLog> = {};

    if (filters.notificationId) {
      where.notificationId = filters.notificationId;
    }

    if (filters.channel) {
      where.channel = filters.channel;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.fromDate || filters.toDate) {
      where.createdAt = Between(
        filters.fromDate || new Date(0),
        filters.toDate || new Date()
      );
    }

    return await this.deliveryLogRepository.find({
      where,
      order: { createdAt: 'DESC' },
      take: filters.limit || 50,
      skip: filters.offset || 0,
      relations: ['notification'],
    });
  }

  /**
   * Busca logs de uma notificação específica
   */
  async findByNotificationId(notificationId: string): Promise<DeliveryLog[]> {
    return await this.deliveryLogRepository.find({
      where: { notificationId },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Busca um log por ID
   */
  async findById(id: string): Promise<DeliveryLog | null> {
    return await this.deliveryLogRepository.findOne({
      where: { id },
      relations: ['notification'],
    });
  }

  /**
   * Estatísticas gerais
   */
  async getStats(filters: { fromDate?: Date; toDate?: Date } = {}) {
    const where: any = {};

    if (filters.fromDate || filters.toDate) {
      where.createdAt = Between(
        filters.fromDate || new Date(0),
        filters.toDate || new Date()
      );
    }

    const [total, sent, failed, processing] = await Promise.all([
      this.deliveryLogRepository.count({ where }),
      this.deliveryLogRepository.count({ where: { ...where, status: 'sent' } }),
      this.deliveryLogRepository.count({ where: { ...where, status: 'failed' } }),
      this.deliveryLogRepository.count({ where: { ...where, status: 'processing' } }),
    ]);

    const avgDuration = await this.deliveryLogRepository
      .createQueryBuilder('log')
      .select('AVG(log.duration_ms)', 'avg')
      .where(where)
      .andWhere('log.duration_ms IS NOT NULL')
      .getRawOne();

    const successRate = total > 0 ? ((sent / total) * 100).toFixed(2) : '0.00';

    return {
      total,
      sent,
      failed,
      processing,
      pending: total - sent - failed - processing,
      successRate: parseFloat(successRate),
      avgDurationMs: avgDuration?.avg ? Math.round(avgDuration.avg) : null,
    };
  }

  /**
   * Estatísticas por canal
   */
  async getStatsByChannel(filters: { fromDate?: Date; toDate?: Date } = {}) {
    const qb = this.deliveryLogRepository.createQueryBuilder('log');

    if (filters.fromDate) {
      qb.andWhere('log.created_at >= :fromDate', { fromDate: filters.fromDate });
    }

    if (filters.toDate) {
      qb.andWhere('log.created_at <= :toDate', { toDate: filters.toDate });
    }

    const results = await qb
      .select('log.channel', 'channel')
      .addSelect('log.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('AVG(log.duration_ms)', 'avgDuration')
      .groupBy('log.channel')
      .addGroupBy('log.status')
      .getRawMany();

    const statsByChannel: any = {};

    results.forEach((row) => {
      if (!statsByChannel[row.channel]) {
        statsByChannel[row.channel] = {
          channel: row.channel,
          total: 0,
          sent: 0,
          failed: 0,
          processing: 0,
          avgDurationMs: null,
        };
      }

      statsByChannel[row.channel][row.status] = parseInt(row.count);
      statsByChannel[row.channel].total += parseInt(row.count);

      if (row.avgDuration) {
        statsByChannel[row.channel].avgDurationMs = Math.round(row.avgDuration);
      }
    });

    return Object.values(statsByChannel);
  }

  /**
   * Logs com falha que podem precisar de atenção
   */
  async getFailedLogs(limit: number = 50): Promise<DeliveryLog[]> {
    return await this.deliveryLogRepository.find({
      where: { status: 'failed' },
      order: { createdAt: 'DESC' },
      take: limit,
      relations: ['notification'],
    });
  }

  /**
   * Timeline de envios (para gráficos)
   */
  async getTimeline(filters: { fromDate?: Date; toDate?: Date; interval?: string } = {}) {
    const interval = filters.interval || '1 hour';

    const qb = this.deliveryLogRepository
      .createQueryBuilder('log')
      .select(`date_trunc('${interval}', log.created_at)`, 'time')
      .addSelect('log.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('time')
      .addGroupBy('log.status')
      .orderBy('time', 'ASC');

    if (filters.fromDate) {
      qb.andWhere('log.created_at >= :fromDate', { fromDate: filters.fromDate });
    }

    if (filters.toDate) {
      qb.andWhere('log.created_at <= :toDate', { toDate: filters.toDate });
    }

    return await qb.getRawMany();
  }
}