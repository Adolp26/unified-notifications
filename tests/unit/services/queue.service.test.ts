import { QueueService } from '../../../src/core/queue.service';
import Queue from 'bull';

jest.mock('bull');

describe('QueueService', () => {
  let service: QueueService;
  let mockQueue: any;
    
  beforeEach(() => {
    (QueueService as any).instance = undefined;

    mockQueue = {
      add: jest.fn(),
      getJob: jest.fn(),
      getWaitingCount: jest.fn(),
      getActiveCount: jest.fn(),
      getCompletedCount: jest.fn(),
      getFailedCount: jest.fn(),
      getDelayedCount: jest.fn(),
      clean: jest.fn(),
      pause: jest.fn(),
      resume: jest.fn(),
      close: jest.fn(),
      on: jest.fn(),
    };

    (Queue as unknown as jest.Mock).mockReturnValue(mockQueue);

    service = QueueService.getInstance();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = QueueService.getInstance();
      const instance2 = QueueService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('addNotification', () => {
    it('should add job to queue with correct data', async () => {
      const jobData = {
        id: '123',
        templateName: 'welcome_email',
        recipient: { email: 'test@test.com', name: 'Test' },
        data: { code: 'ABC' },
        channel: 'email',
      };

      const mockJob = { id: 'job-123', data: jobData };
      mockQueue.add.mockResolvedValue(mockJob);

      const result = await service.addNotification(jobData);

      expect(mockQueue.add).toHaveBeenCalledWith(jobData, { priority: 5 });
      expect(result).toEqual(mockJob);
    });

    it('should set correct priority for high priority job', async () => {
      const jobData = {
        id: '123',
        templateName: 'test',
        recipient: { email: 'test@test.com' },
        data: {},
        channel: 'email',
        priority: 'high' as const,
      };

      mockQueue.add.mockResolvedValue({ id: 'job-123' });

      await service.addNotification(jobData);

      expect(mockQueue.add).toHaveBeenCalledWith(jobData, { priority: 1 });
    });

    it('should set correct priority for low priority job', async () => {
      const jobData = {
        id: '123',
        templateName: 'test',
        recipient: { email: 'test@test.com' },
        data: {},
        channel: 'email',
        priority: 'low' as const,
      };

      mockQueue.add.mockResolvedValue({ id: 'job-123' });

      await service.addNotification(jobData);

      expect(mockQueue.add).toHaveBeenCalledWith(jobData, { priority: 10 });
    });

    it('should pass custom options', async () => {
      const jobData = {
        id: '123',
        templateName: 'test',
        recipient: { email: 'test@test.com' },
        data: {},
        channel: 'email',
      };

      const customOptions = {
        delay: 5000,
        attempts: 5,
      };

      mockQueue.add.mockResolvedValue({ id: 'job-123' });

      await service.addNotification(jobData, customOptions);

      expect(mockQueue.add).toHaveBeenCalledWith(jobData, {
        ...customOptions,
        priority: 5,
      });
    });
  });

  describe('scheduleNotification', () => {
    it('should schedule notification for future date', async () => {
      const futureDate = new Date(Date.now() + 3600000); // 1 hour from now
      const jobData = {
        id: '123',
        templateName: 'test',
        recipient: { email: 'test@test.com' },
        data: {},
        channel: 'email',
      };

      mockQueue.add.mockResolvedValue({ id: 'job-123' });

      await service.scheduleNotification(jobData, futureDate);

      expect(mockQueue.add).toHaveBeenCalledWith(jobData, {
        delay: expect.any(Number),
        priority: 5,
      });

      const callArgs = mockQueue.add.mock.calls[0][1];
      expect(callArgs.delay).toBeGreaterThan(0);
    });

    it('should throw error for past date', async () => {
      const pastDate = new Date(Date.now() - 3600000); // 1 hour ago
      const jobData = {
        id: '123',
        templateName: 'test',
        recipient: { email: 'test@test.com' },
        data: {},
        channel: 'email',
      };

      await expect(service.scheduleNotification(jobData, pastDate)).rejects.toThrow(
        'Scheduled time must be in the future'
      );
    });
  });

  describe('getJob', () => {
    it('should return job if found', async () => {
      const mockJob = { id: 'job-123', data: {} };
      mockQueue.getJob.mockResolvedValue(mockJob);

      const result = await service.getJob('job-123');

      expect(result).toEqual(mockJob);
      expect(mockQueue.getJob).toHaveBeenCalledWith('job-123');
    });

    it('should return null if job not found', async () => {
      mockQueue.getJob.mockResolvedValue(null);

      const result = await service.getJob('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('removeJob', () => {
    it('should remove job if exists', async () => {
      const mockJob = {
        id: 'job-123',
        remove: jest.fn().mockResolvedValue(undefined),
      };

      mockQueue.getJob.mockResolvedValue(mockJob);

      await service.removeJob('job-123');

      expect(mockJob.remove).toHaveBeenCalled();
    });

    it('should not throw if job does not exist', async () => {
      mockQueue.getJob.mockResolvedValue(null);

      await expect(service.removeJob('non-existent')).resolves.not.toThrow();
    });
  });

  describe('getStats', () => {
    it('should return queue statistics', async () => {
      mockQueue.getWaitingCount.mockResolvedValue(5);
      mockQueue.getActiveCount.mockResolvedValue(2);
      mockQueue.getCompletedCount.mockResolvedValue(100);
      mockQueue.getFailedCount.mockResolvedValue(3);
      mockQueue.getDelayedCount.mockResolvedValue(10);

      const stats = await service.getStats();

      expect(stats).toEqual({
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 3,
        delayed: 10,
        total: 120,
      });
    });
  });

  describe('clean', () => {
    it('should clean completed and failed jobs', async () => {
      mockQueue.clean.mockResolvedValue([]);

      await service.clean(3600000); // 1 hour

      expect(mockQueue.clean).toHaveBeenCalledWith(3600000, 'completed');
      expect(mockQueue.clean).toHaveBeenCalledWith(3600000, 'failed');
    });

    it('should use default grace period if not provided', async () => {
      mockQueue.clean.mockResolvedValue([]);

      await service.clean();

      expect(mockQueue.clean).toHaveBeenCalledWith(24 * 3600 * 1000, 'completed');
    });
  });

  describe('pause and resume', () => {
    it('should pause queue', async () => {
      mockQueue.pause.mockResolvedValue(undefined);

      await service.pause();

      expect(mockQueue.pause).toHaveBeenCalled();
    });

    it('should resume queue', async () => {
      mockQueue.resume.mockResolvedValue(undefined);

      await service.resume();

      expect(mockQueue.resume).toHaveBeenCalled();
    });
  });

  describe('close', () => {
    it('should close queue connection', async () => {
      mockQueue.close.mockResolvedValue(undefined);

      await service.close();

      expect(mockQueue.close).toHaveBeenCalled();
    });
  });
});