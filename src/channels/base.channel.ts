import { IChannel, SendMessageParams, SendMessageResult, ChannelRecipient } from '../types/channel.types';

export abstract class BaseChannel implements IChannel {
    abstract readonly name: string;

    abstract send(params: SendMessageParams): Promise<SendMessageResult>;

    abstract isAvailable(): Promise<boolean>;


    // Método abstrato - valida recipient
    abstract validateRecipient(recipient: ChannelRecipient): boolean;

    // Método auxiliar - cria resultado de sucesso
    protected createSuccessResult(
        messageId: string,
        provider?: string,
        metadata?: Record<string, any>
    ): SendMessageResult {
        return {
            success: true,
            messageId,
            provider,
            metadata,
        };
    }

    // Método auxiliar - cria resultado de erro
    protected createErrorResult(error: string, metadata?: Record<string, any>): SendMessageResult {
        return {
            success: false,
            error,
            metadata,
        };
    }
    //Método auxiliar - valida email
    protected isValidEmail(email?: string): boolean {
        if (!email) return false;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Método auxiliar - valida telefone (formato básico)
    protected isValidPhone(phone?: string): boolean {
        if (!phone) return false;
        const cleaned = phone.replace(/\D/g, '');
        return cleaned.length >= 10 && cleaned.length <= 15;
    }
    // Método auxiliar - sanitiza HTML(básico)
    protected sanitizeHtml(html: string): string {
        // TODO: implementar sanitização HTML com alguma biblioteca (DOMPurify) 
        return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    }
}