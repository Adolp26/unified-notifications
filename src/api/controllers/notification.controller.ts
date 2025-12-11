import { Request, Response } from 'express';
import { NotificationService, SendNotificationDTO } from '../../core/notification.service';
import { DeliveryLogService } from '../../core/delivery-log.service';
import { QueueService } from '../../core/queue.service';

export class NotificationController {
  private service: NotificationService;
  private logService: DeliveryLogService;
  private queueService: QueueService;

  constructor() {
    this.service = new NotificationService();
    this.logService = new DeliveryLogService();
    this.queueService = QueueService.getInstance();
  }

  send = async (req: Request, res: Response): Promise<void> => {
    try {
      const dto: SendNotificationDTO = req.body;
      const result = await this.service.send(dto);

      res.status(202).json(result);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  };

  /**
   * Busca notificação por ID
   */
  getById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const notification = await this.service.findById(id);

      if (!notification) {
        res.status(404).json({ error: 'Notification not found' });
        return;
      }

      res.status(200).json(notification);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * Lista notificações
   */
  list = async (req: Request, res: Response): Promise<void> => {
    try {
      const { status, channel, priority, limit, offset } = req.query;

      const notifications = await this.service.findAll({
        status: status as string,
        channel: channel as string,
        priority: priority as string,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });

      res.status(200).json({
        total: notifications.length,
        notifications,
      });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * Busca logs de uma notificação
   */
  getLogs = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const logs = await this.logService.findByNotificationId(id);

      res.status(200).json({
        notificationId: id,
        total: logs.length,
        logs,
      });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * Estatísticas gerais
   */
  getDeliveryStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const { fromDate, toDate } = req.query;

      const stats = await this.logService.getStats({
        fromDate: fromDate ? new Date(fromDate as string) : undefined,
        toDate: toDate ? new Date(toDate as string) : undefined,
      });

      res.status(200).json(stats);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * Estatísticas por canal
   */
  getStatsByChannel = async (req: Request, res: Response): Promise<void> => {
    try {
      const { fromDate, toDate } = req.query;

      const stats = await this.logService.getStatsByChannel({
        fromDate: fromDate ? new Date(fromDate as string) : undefined,
        toDate: toDate ? new Date(toDate as string) : undefined,
      });

      res.status(200).json(stats);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * Logs com falha
   */
  getFailedLogs = async (req: Request, res: Response): Promise<void> => {
    try {
      const { limit } = req.query;
      const logs = await this.logService.getFailedLogs(
        limit ? parseInt(limit as string) : undefined
      );

      res.status(200).json({
        total: logs.length,
        logs,
      });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * Timeline (para gráficos)
   */
  getTimeline = async (req: Request, res: Response): Promise<void> => {
    try {
      const { fromDate, toDate, interval } = req.query;

      const timeline = await this.logService.getTimeline({
        fromDate: fromDate ? new Date(fromDate as string) : undefined,
        toDate: toDate ? new Date(toDate as string) : undefined,
        interval: interval as string,
      });

      res.status(200).json(timeline);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  // ... métodos existentes (getJobStatus, getStats) ...

  getJobStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { jobId } = req.params;
      const job = await this.queueService.getJob(jobId);

      if (!job) {
        res.status(404).json({ error: 'Job not found' });
        return;
      }

      const state = await job.getState();
      const progress = job.progress();

      res.status(200).json({
        jobId: job.id,
        state,
        progress,
        data: job.data,
        attemptsMade: job.attemptsMade,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
        failedReason: job.failedReason,
      });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  getStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const stats = await this.queueService.getStats();
      res.status(200).json(stats);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}