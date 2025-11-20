import Queue, { Job, JobOptions } from 'bull';
import { queueConfig } from '../config/queue.config';

export interface NotificationJobData {
  id: string;
  templateName: string;
  recipient: {
    email?: string;
    phone?: string;
    name?: string;
    [key: string]: any;
  };
  data: Record<string, any>;
  channel: string;
  priority?: 'low' | 'normal' | 'high';
}

export class QueueService {
  private notificationQueue: Queue.Queue<NotificationJobData>;
  private static instance: QueueService;

  private constructor() {
    this.notificationQueue = new Queue<NotificationJobData>(
      'notifications',
      {
        redis: queueConfig.redis,
        defaultJobOptions: queueConfig.defaultJobOptions,
      }
    );

    this.setupEventListeners();
  }

  /**
   * Singleton pattern - uma única instância da fila
   */
  public static getInstance(): QueueService {
    if (!QueueService.instance) {
      QueueService.instance = new QueueService();
    }
    return QueueService.instance;
  }

  /**
   * Adiciona notificação na fila
   */
  async addNotification(
    data: NotificationJobData,
    options?: JobOptions
  ): Promise<Job<NotificationJobData>> {
    const priority = this.getPriorityValue(data.priority);

    const job = await this.notificationQueue.add(data, {
      ...options,
      priority,
    });

    console.log(`📩 Job ${job.id} added to queue (priority: ${data.priority || 'normal'})`);
    return job;
  }

  /**
   * Adiciona notificação agendada (scheduled)
   */
  async scheduleNotification(
    data: NotificationJobData,
    scheduledFor: Date
  ): Promise<Job<NotificationJobData>> {
    const delay = scheduledFor.getTime() - Date.now();

    if (delay < 0) {
      throw new Error('Scheduled time must be in the future');
    }

    return this.addNotification(data, { delay });
  }

  /**
   * Busca job por ID
   */
  async getJob(jobId: string): Promise<Job<NotificationJobData> | null> {
    return this.notificationQueue.getJob(jobId);
  }

  /**
   * Remove job da fila
   */
  async removeJob(jobId: string): Promise<void> {
    const job = await this.getJob(jobId);
    if (job) {
      await job.remove();
    }
  }

  /**
   * Retorna estatísticas da fila
   */
  async getStats() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.notificationQueue.getWaitingCount(),
      this.notificationQueue.getActiveCount(),
      this.notificationQueue.getCompletedCount(),
      this.notificationQueue.getFailedCount(),
      this.notificationQueue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
    };
  }

  /**
   * Limpa jobs antigos
   */
  async clean(grace: number = 24 * 3600 * 1000): Promise<void> {
    // Remove completed jobs mais antigos que 'grace' ms
    await this.notificationQueue.clean(grace, 'completed');
    await this.notificationQueue.clean(grace, 'failed');
  }

  /**
   * Pausa processamento da fila
   */
  async pause(): Promise<void> {
    await this.notificationQueue.pause();
    console.log('⏸️  Queue paused');
  }

  /**
   * Retoma processamento da fila
   */
  async resume(): Promise<void> {
    await this.notificationQueue.resume();
    console.log('▶️  Queue resumed');
  }

  /**
   * Fecha a fila (cleanup)
   */
  async close(): Promise<void> {
    await this.notificationQueue.close();
    console.log('🔌 Queue closed');
  }

  /**
   * Retorna a fila (para workers processarem)
   */
  getQueue(): Queue.Queue<NotificationJobData> {
    return this.notificationQueue;
  }

  /**
   * Converte prioridade string em número
   */
  private getPriorityValue(priority?: 'low' | 'normal' | 'high'): number {
    const priorityMap = {
      high: 1,
      normal: 5,
      low: 10,
    };

    return priorityMap[priority || 'normal'];
  }

  /**
   * Configura listeners de eventos
   */
  private setupEventListeners(): void {
    this.notificationQueue.on('completed', (job: Job) => {
      console.log(`✅ Job ${job.id} completed successfully`);
    });

    this.notificationQueue.on('failed', (job: Job, err: Error) => {
      console.error(`❌ Job ${job.id} failed: ${err.message}`);
    });

    this.notificationQueue.on('stalled', (job: Job) => {
      console.warn(`⚠️  Job ${job.id} stalled`);
    });

    this.notificationQueue.on('error', (error: Error) => {
      console.error(`🚨 Queue error: ${error.message}`);
    });
  }
}