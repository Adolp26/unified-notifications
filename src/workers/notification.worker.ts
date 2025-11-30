import { Job } from 'bull';
import { QueueService, NotificationJobData } from '../core/queue.service';
import { NotificationService } from '../core/notification.service';
import { AppDataSource } from '../config/database.config';

export class NotificationWorker {
  private queueService: QueueService;
  private notificationService: NotificationService;

  constructor() {
    this.queueService = QueueService.getInstance();
    this.notificationService = new NotificationService();
  }

  async start(concurrency: number = 5): Promise<void> {
    console.log(`🚀 Starting notification worker with concurrency: ${concurrency}`);

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('✅ Database connected');
    }
    const queue = this.queueService.getQueue();

    queue.process(concurrency, async (job: Job<NotificationJobData>) => {
      return this.processJob(job);
    });

    console.log('✅ Worker started and listening for jobs');
  }

  private async processJob(job: Job<NotificationJobData>): Promise<any> {
    const startTime = Date.now();
    console.log(`📋 Processing job ${job.id} (attempt ${job.attemptsMade + 1}/${job.opts.attempts})`);

    try {

      const notification = await this.notificationService.prepare({
        templateName: job.data.templateName,
        recipient: job.data.recipient,
        data: job.data.data,
        channels: [job.data.channel],
      });

      // TODO: Implementar channels (email, sms, etc)
      await this.simulateSend(notification, job.data.channel);

      const duration = Date.now() - startTime;
      console.log(`✅ Job ${job.id} completed in ${duration}ms`);

      return {
        success: true,
        jobId: job.id,
        channel: job.data.channel,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Job ${job.id} failed after ${duration}ms:`, error);

      throw error;
    }
  }

  private async simulateSend(notification: any, channel: string): Promise<void> {
    // Simular latência de rede
    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.log(`📤 [${channel.toUpperCase()}] Sent to: ${notification.recipient.email || notification.recipient.phone}`);
    console.log(`   Subject: ${notification.processedSubject || 'N/A'}`);
    console.log(`   Body preview: ${notification.processedBody.substring(0, 50)}...`);

    if (Math.random() < 0.05) {
      throw new Error('Simulated network error');
    }
  }

  async stop(): Promise<void> {
    console.log('🛑 Stopping worker...');
    await this.queueService.close();
    await AppDataSource.destroy();
    console.log('✅ Worker stopped');
  }
}

if (require.main === module) {
  const worker = new NotificationWorker();

  worker.start().catch((error) => {
    console.error('Failed to start worker:', error);
    process.exit(1);
  });

  process.on('SIGTERM', async () => {
    await worker.stop();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    await worker.stop();
    process.exit(0);
  });
}