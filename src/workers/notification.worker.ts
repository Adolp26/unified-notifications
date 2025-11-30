import { Job } from 'bull';
import { QueueService, NotificationJobData } from '../core/queue.service';
import { NotificationService } from '../core/notification.service';
import { AppDataSource } from '../config/database.config';
import { ChannelFactory } from '../channels/channel.factory';

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

    await ChannelFactory.initializeDefaults();
    console.log(`✅ Channels registered: ${ChannelFactory.list().join(', ')}`);

    const queue = this.queueService.getQueue();

    queue.process(concurrency, async (job: Job<NotificationJobData>) => {
      return this.processJob(job);
    });

    console.log('✅ Worker started and listening for jobs');
  }

  private async processJob(job: Job<NotificationJobData>): Promise<any> {
    const startTime = Date.now();
    console.log(
      `📋 Processing job ${job.id} [${job.data.channel}] (attempt ${job.attemptsMade + 1}/${job.opts.attempts})`
    );

    try {

      const notification = await this.notificationService.prepare({
        templateName: job.data.templateName,
        recipient: job.data.recipient,
        data: job.data.data,
        channels: [job.data.channel],
      });

      const channel = ChannelFactory.get(job.data.channel);

      if (!channel.validateRecipient(job.data.recipient)) {
        throw new Error(`Invalid recipient for channel ${job.data.channel}`);
      }

      const available = await channel.isAvailable();
      if (!available) {
        throw new Error(`Channel ${job.data.channel} is not available`);
      }

      const result = await channel.send({
        recipient: job.data.recipient,
        subject: notification.processedSubject,
        body: notification.processedBody,
        metadata: {
          jobId: job.id,
          templateName: job.data.templateName,
        },
      });

      if (!result.success) {
        throw new Error(result.error || 'Channel send failed');
      }

      const duration = Date.now() - startTime;
      console.log(
        `✅ Job ${job.id} completed in ${duration}ms (messageId: ${result.messageId})`
      );

      return {
        success: true,
        jobId: job.id,
        channel: job.data.channel,
        messageId: result.messageId,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Job ${job.id} failed after ${duration}ms:`, error);

      throw error;
    }
  }

  /**
   * Stop worker gracefully
   */
  async stop(): Promise<void> {
    console.log('🛑 Stopping worker...');
    await this.queueService.close();
    await AppDataSource.destroy();
    console.log('✅ Worker stopped');
  }
}

// Se rodar este arquivo diretamente
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