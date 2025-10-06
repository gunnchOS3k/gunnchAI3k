import { Client } from 'discord.js';
import { Logger } from '../utils/logger';

export class NotificationManager {
  private client: Client;
  private logger: Logger;
  private focusMode: boolean = false;

  constructor(client: Client) {
    this.client = client;
    this.logger = new Logger();
  }

  async setFocusMode(enabled: boolean) {
    this.focusMode = enabled;
    this.logger.info(`Focus mode ${enabled ? 'enabled' : 'disabled'}`);
  }

  async sendNotification(channelId: string, message: string, priority: 'low' | 'medium' | 'high' = 'medium') {
    if (this.focusMode && priority === 'low') {
      this.logger.info('Notification suppressed due to focus mode');
      return;
    }

    try {
      const channel = await this.client.channels.fetch(channelId);
      if (channel && channel.isTextBased()) {
        await channel.send(message);
        this.logger.info(`Notification sent to channel ${channelId}`);
      }
    } catch (error) {
      this.logger.error('Failed to send notification:', error);
    }
  }

  async sendUrgentNotification(channelId: string, message: string) {
    // Urgent notifications bypass focus mode
    const originalFocusMode = this.focusMode;
    this.focusMode = false;
    
    try {
      await this.sendNotification(channelId, `🚨 URGENT: ${message}`, 'high');
    } finally {
      this.focusMode = originalFocusMode;
    }
  }

  async sendLearningNotification(channelId: string, learning: string) {
    const message = `🧠 Learning Update: ${learning}`;
    await this.sendNotification(channelId, message, 'medium');
  }

  async sendRiskNotification(channelId: string, risk: string) {
    const message = `⚠️ Risk Alert: ${risk}`;
    await this.sendNotification(channelId, message, 'high');
  }

  async sendSuccessNotification(channelId: string, success: string) {
    const message = `✅ Success: ${success}`;
    await this.sendNotification(channelId, message, 'medium');
  }
}
