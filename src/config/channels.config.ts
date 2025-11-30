import * as dotenv from 'dotenv';

dotenv.config();

export interface EmailConfig {
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  from: {
    name: string;
    address: string;
  };
  options: {
    pool: boolean;
    maxConnections: number;
    maxMessages: number;
  };
}

export const emailConfig: EmailConfig = {
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
  },
  from: {
    name: process.env.EMAIL_FROM_NAME || 'Unified Notifications',
    address: process.env.EMAIL_FROM_ADDRESS || 'noreply@unifiednotifications.com',
  },
  options: {
    pool: true, 
    maxConnections: 5,
    maxMessages: 100,
  },
};