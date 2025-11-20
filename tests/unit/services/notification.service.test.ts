import { NotificationService, SendNotificationDTO } from '../../../src/core/notification.service';
import { AppDataSource } from '../../../src/config/database.config';
import { Template } from '../../../src/database/entities/template.entity';

jest.mock('../../../src/config/database.config', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

describe('NotificationService', () => {
  let service: NotificationService;
  let mockRepository: any;

  beforeEach(() => {
    mockRepository = {
      findOne: jest.fn(),
    };

    (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockRepository);
    service = new NotificationService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('prepare', () => {
    it('should prepare notification successfully', async () => {
      const mockTemplate = {
        id: '123',
        name: 'welcome_email',
        channel: 'email',
        subject: 'Welcome {{name}}!',
        body: 'Hello {{name}}, your code is {{code}}',
        variables: ['name', 'code'],
      };

      mockRepository.findOne.mockResolvedValue(mockTemplate);

      const dto: SendNotificationDTO = {
        templateName: 'welcome_email',
        recipient: {
          email: 'joao@test.com',
          name: 'João',
        },
        data: {
          code: 'ABC123',
        },
      };

      const result = await service.prepare(dto);

      expect(result.processedSubject).toBe('Welcome João!');
      expect(result.processedBody).toBe('Hello João, your code is ABC123');
      expect(result.channels).toEqual(['email']);
      expect(result.priority).toBe('normal');
    });

    it('should throw error if template not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const dto: SendNotificationDTO = {
        templateName: 'non_existent',
        recipient: { email: 'test@test.com' },
        data: {},
      };

      await expect(service.prepare(dto)).rejects.toThrow(
        'Template "non_existent" not found'
      );
    });

    it('should throw error if missing required variables', async () => {
      const mockTemplate = {
        name: 'welcome_email',
        channel: 'email',
        subject: 'Welcome {{name}}!',
        body: 'Your code is {{code}}',
        variables: ['name', 'code'],
      };

      mockRepository.findOne.mockResolvedValue(mockTemplate);

      const dto: SendNotificationDTO = {
        templateName: 'welcome_email',
        recipient: { email: 'test@test.com' },
        data: { name: 'João' }, // Missing 'code'
      };

      await expect(service.prepare(dto)).rejects.toThrow(
        'Missing required variables: code'
      );
    });

    it('should merge recipient and data context', async () => {
      const mockTemplate = {
        name: 'test',
        channel: 'email',
        body: 'Name: {{name}}, Email: {{email}}, Code: {{code}}',
        variables: ['name', 'email', 'code'],
      };

      mockRepository.findOne.mockResolvedValue(mockTemplate);

      const dto: SendNotificationDTO = {
        templateName: 'test',
        recipient: {
          email: 'joao@test.com',
          name: 'João',
        },
        data: {
          code: 'XYZ',
        },
      };

      const result = await service.prepare(dto);

      expect(result.processedBody).toBe('Name: João, Email: joao@test.com, Code: XYZ');
    });

    it('should use custom channels if provided', async () => {
      const mockTemplate = {
        name: 'multi_channel',
        channel: 'email',
        body: 'Test',
      };

      mockRepository.findOne.mockResolvedValue(mockTemplate);

      const dto: SendNotificationDTO = {
        templateName: 'multi_channel',
        recipient: { email: 'test@test.com' },
        data: {},
        channels: ['email', 'sms'],
      };

      const result = await service.prepare(dto);

      expect(result.channels).toEqual(['email', 'sms']);
    });

    it('should set priority and scheduledFor', async () => {
      const mockTemplate = {
        name: 'test',
        channel: 'email',
        body: 'Test',
      };

      mockRepository.findOne.mockResolvedValue(mockTemplate);

      const scheduledDate = new Date('2025-12-31');

      const dto: SendNotificationDTO = {
        templateName: 'test',
        recipient: { email: 'test@test.com' },
        data: {},
        priority: 'high',
        scheduledFor: scheduledDate,
      };

      const result = await service.prepare(dto);

      expect(result.priority).toBe('high');
      expect(result.scheduledFor).toEqual(scheduledDate);
    });
  });

  describe('validate', () => {
    it('should return valid for correct notification', async () => {
      const mockTemplate = {
        name: 'test',
        channel: 'email',
        body: 'Hello {{name}}',
        variables: ['name'],
      };

      mockRepository.findOne.mockResolvedValue(mockTemplate);

      const dto: SendNotificationDTO = {
        templateName: 'test',
        recipient: { email: 'test@test.com', name: 'João' },
        data: {},
      };

      const result = await service.validate(dto);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should detect missing template', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const dto: SendNotificationDTO = {
        templateName: 'non_existent',
        recipient: { email: 'test@test.com' },
        data: {},
      };

      const result = await service.validate(dto);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Template "non_existent" not found');
    });

    it('should detect missing email for email channel', async () => {
      const mockTemplate = {
        name: 'test',
        channel: 'email',
        body: 'Test',
      };

      mockRepository.findOne.mockResolvedValue(mockTemplate);

      const dto: SendNotificationDTO = {
        templateName: 'test',
        recipient: { name: 'João' }, // No email
        data: {},
      };

      const result = await service.validate(dto);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Email channel requires recipient.email');
    });

    it('should detect missing phone for sms channel', async () => {
      const mockTemplate = {
        name: 'test',
        channel: 'sms',
        body: 'Test',
      };

      mockRepository.findOne.mockResolvedValue(mockTemplate);

      const dto: SendNotificationDTO = {
        templateName: 'test',
        recipient: { email: 'test@test.com' }, // No phone
        data: {},
        channels: ['sms'],
      };

      const result = await service.validate(dto);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('SMS channel requires recipient.phone');
    });

    it('should detect missing variables', async () => {
      const mockTemplate = {
        name: 'test',
        channel: 'email',
        body: 'Hello {{name}}, code: {{code}}',
        variables: ['name', 'code'],
      };

      mockRepository.findOne.mockResolvedValue(mockTemplate);

      const dto: SendNotificationDTO = {
        templateName: 'test',
        recipient: { email: 'test@test.com', name: 'João' },
        data: {}, // Missing code
      };

      const result = await service.validate(dto);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('code'))).toBe(true);
    });
  });
});