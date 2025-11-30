import { Request, Response } from 'express';
import { NotificationService, SendNotificationDTO } from '../../core/notification.service';
import { QueueService } from '../../core/queue.service';

export class NotificationController {
  private service: NotificationService;
  private queueService: QueueService;

  constructor() {
    this.service = new NotificationService();
    this.queueService = QueueService.getInstance();
  }

  send = async (req: Request, res: Response): Promise<void> => {
    try {
      const dto: SendNotificationDTO = req.body;
      const result = await this.service.send(dto);

      res.status(202).json(result); // 202 Accepted
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  };


  // Busca status de um job
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


  // Retorna estatísticas da fila
  getStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const stats = await this.queueService.getStats();
      res.status(200).json(stats);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}