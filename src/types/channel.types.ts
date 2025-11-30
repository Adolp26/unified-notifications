export interface ChannelRecipient {
  email?: string;
  phone?: string;
  name?: string;
  pushToken?: string;
  webhookUrl?: string;
  [key: string]: any;
}

export interface SendMessageParams {
  recipient: ChannelRecipient;
  subject?: string;
  body: string;
  metadata?: Record<string, any>;
}

export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  provider?: string;
  error?: string;
  metadata?: Record<string, any>;
}

export interface ChannelConfig {
  enabled: boolean;
  [key: string]: any;
}

export interface IChannel {
  
  readonly name: string;

  send(params: SendMessageParams): Promise<SendMessageResult>;

  isAvailable(): Promise<boolean>;

  validateRecipient(recipient: ChannelRecipient): boolean;
}