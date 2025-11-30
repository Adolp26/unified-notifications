import { IChannel } from '../types/channel.types';
import { EmailChannel } from './email.channel';

export class ChannelFactory {
    private static channels: Map<string, IChannel> = new Map();

    // Regostra um canal
    static register(channel: IChannel): void {
        this.channels.set(channel.name, channel);
        console.log(`📦 Channel registered: ${channel.name}`);
    }

    // Obtém um canal pelo nome
    static get(channelName: string): IChannel {
        const channel = this.channels.get(channelName);

        if (!channel) {
            throw new Error(`Channel "${channelName}" not found`);
        }

        return channel;
    }

    // sVerifica se um canal existe
    static has(channelName: string): boolean {
        return this.channels.has(channelName);
    }

    // Lista todos os canais registrados
    static list(): string[] {
        return Array.from(this.channels.keys());
    }

    // Inicializa canais padrão
    static async initializeDefaults(): Promise<void> {
        const emailChannel = new EmailChannel();
        this.register(emailChannel);

        const available = await emailChannel.isAvailable();
        console.log(`📧 Email channel available: ${available}`);

        // TODO: Adicionar outros canais aqui
        // this.register(new SmsChannel());
        // this.register(new PushChannel());
    }
}