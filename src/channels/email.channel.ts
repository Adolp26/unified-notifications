import nodemailer, { Transporter } from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import { BaseChannel } from './base.channel';
import { SendMessageParams, SendMessageResult, ChannelRecipient } from '../types/channel.types';
import { emailConfig } from '../config/channels.config';


export class EmailChannel extends BaseChannel {
    readonly name = 'email';
    private transporter: Transporter | null = null;
    private isInitialized = false;


    private async initialize(): Promise<void> {
        if (this.isInitialized) return;

        try {
            this.transporter = nodemailer.createTransport(
                {
                    host: emailConfig.smtp.host,
                    port: emailConfig.smtp.port,
                    secure: emailConfig.smtp.secure,
                    auth: emailConfig.smtp.auth,
                    pool: emailConfig.options.pool,
                    maxConnections: emailConfig.options.maxConnections,
                    maxMessages: emailConfig.options.maxMessages,
                } as SMTPTransport.Options
            );

            await this.transporter.verify();
            this.isInitialized = true;
            console.log('✅ Email channel initialized');
        } catch (error) {
            console.error('❌ Failed to initialize email channel:', error);
            throw error;
        }
    }

    async send(params: SendMessageParams): Promise<SendMessageResult> {
        try {
            if (!this.validateRecipient(params.recipient)) {
                return this.createErrorResult('Invalid email recipient');
            }

            await this.initialize();

            if (!this.transporter) {
                return this.createErrorResult('Email transporter not initialized');
            }

            const mailOptions = {
                from: `"${emailConfig.from.name}" <${emailConfig.from.address}>`,
                to: params.recipient.email!,
                subject: params.subject || 'Notification',
                html: this.sanitizeHtml(params.body),
                text: this.stripHtml(params.body),
            };

            const info = await this.transporter.sendMail(mailOptions);

            console.log(`📧 Email sent to ${params.recipient.email} (${info.messageId})`);

            return this.createSuccessResult(info.messageId, 'nodemailer', {
                accepted: info.accepted,
                rejected: info.rejected,
                response: info.response,
            });
        } catch (error) {
            console.error('❌ Email send failed:', error);
            return this.createErrorResult(
                error instanceof Error ? error.message : 'Unknown error',
                { recipient: params.recipient.email }
            );
        }
    }

    async isAvailable(): Promise<boolean> {
        try {
            await this.initialize();
            return this.transporter !== null;
        } catch (error) {
            return false;
        }
    }

    validateRecipient(recipient: ChannelRecipient): boolean {
        return this.isValidEmail(recipient.email);
    }

    private stripHtml(html: string): string {
        return html
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .trim();
    }

    async close(): Promise<void> {
        if (this.transporter) {
            this.transporter.close();
            this.transporter = null;
            this.isInitialized = false;
            console.log('🔌 Email channel closed');
        }
    }
}