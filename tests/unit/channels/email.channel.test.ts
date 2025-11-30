import { EmailChannel } from '../../../src/channels/email.channel';
import nodemailer from 'nodemailer';

// Mock do Nodemailer
jest.mock('nodemailer');

describe('EmailChannel', () => {
  let channel: EmailChannel;
  let mockTransporter: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock do transporter
    mockTransporter = {
      sendMail: jest.fn(),
      verify: jest.fn(),
      close: jest.fn(),
    };

    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);
    mockTransporter.verify.mockResolvedValue(true);

    channel = new EmailChannel();
  });

  describe('name', () => {
    it('should have correct name', () => {
      expect(channel.name).toBe('email');
    });
  });

  describe('validateRecipient', () => {
    it('should validate correct email', () => {
      const result = channel.validateRecipient({ email: 'test@example.com' });
      expect(result).toBe(true);
    });

    it('should reject invalid email', () => {
      expect(channel.validateRecipient({ email: 'invalid-email' })).toBe(false);
      expect(channel.validateRecipient({ email: '' })).toBe(false);
      expect(channel.validateRecipient({ email: 'test@' })).toBe(false);
      expect(channel.validateRecipient({ email: '@example.com' })).toBe(false);
    });

    it('should reject missing email', () => {
      expect(channel.validateRecipient({})).toBe(false);
      expect(channel.validateRecipient({ name: 'Test' })).toBe(false);
    });
  });

  describe('isAvailable', () => {
    it('should return true when transporter is initialized', async () => {
      const result = await channel.isAvailable();
      expect(result).toBe(true);
      expect(mockTransporter.verify).toHaveBeenCalled();
    });

    it('should return false when initialization fails', async () => {
      mockTransporter.verify.mockRejectedValue(new Error('Connection failed'));

      const result = await channel.isAvailable();
      expect(result).toBe(false);
    });
  });

  describe('send', () => {
    it('should send email successfully', async () => {
      const mockInfo = {
        messageId: 'test-message-id-123',
        accepted: ['test@example.com'],
        rejected: [],
        response: '250 OK',
      };

      mockTransporter.sendMail.mockResolvedValue(mockInfo);

      const result = await channel.send({
        recipient: { email: 'test@example.com', name: 'Test User' },
        subject: 'Test Subject',
        body: '<h1>Hello World</h1>',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('test-message-id-123');
      expect(result.provider).toBe('nodemailer');
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          subject: 'Test Subject',
          html: '<h1>Hello World</h1>',
        })
      );
    });

    it('should include text version of email', async () => {
      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-id',
        accepted: [],
        rejected: [],
      });

      await channel.send({
        recipient: { email: 'test@example.com' },
        subject: 'Test',
        body: '<p>Hello <strong>World</strong></p>',
      });

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'Hello World',
        })
      );
    });

    it('should sanitize HTML', async () => {
      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-id',
        accepted: [],
        rejected: [],
      });

      const maliciousHtml = '<p>Safe content</p><script>alert("xss")</script>';

      await channel.send({
        recipient: { email: 'test@example.com' },
        body: maliciousHtml,
      });

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).not.toContain('<script>');
      expect(callArgs.html).toContain('Safe content');
    });

    it('should return error for invalid recipient', async () => {
      const result = await channel.send({
        recipient: { email: 'invalid-email' },
        body: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email recipient');
      expect(mockTransporter.sendMail).not.toHaveBeenCalled();
    });

    it('should handle send failure', async () => {
      mockTransporter.sendMail.mockRejectedValue(new Error('SMTP error'));

      const result = await channel.send({
        recipient: { email: 'test@example.com' },
        body: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('SMTP error');
    });

    it('should use default subject if not provided', async () => {
      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-id',
        accepted: [],
        rejected: [],
      });

      await channel.send({
        recipient: { email: 'test@example.com' },
        body: 'Test body',
      });

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Notification',
        })
      );
    });

    it('should initialize transporter before sending', async () => {
      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-id',
        accepted: [],
        rejected: [],
      });

      await channel.send({
        recipient: { email: 'test@example.com' },
        body: 'Test',
      });

      expect(nodemailer.createTransport).toHaveBeenCalled();
      expect(mockTransporter.verify).toHaveBeenCalled();
    });
  });

  describe('close', () => {
    it('should close transporter connection', async () => {
      await channel.isAvailable();

      await channel.close();

      expect(mockTransporter.close).toHaveBeenCalled();
    });

    it('should handle close when not initialized', async () => {
      await expect(channel.close()).resolves.not.toThrow();
    });
  });
});