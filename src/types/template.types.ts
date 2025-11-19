export interface CreateTemplateDTO {
  name: string;
  channel: 'email' | 'sms' | 'push' | 'webhook';
  subject?: string;
  body: string;
  variables?: string[];
  metadata?: Record<string, any>;
}

export interface UpdateTemplateDTO {
  name?: string;
  channel?: 'email' | 'sms' | 'push' | 'webhook';
  subject?: string;
  body?: string;
  variables?: string[];
  metadata?: Record<string, any>;
}

export interface TemplateResponseDTO {
  id: string;
  name: string;
  channel: string;
  subject?: string;
  body: string;
  variables?: string[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}