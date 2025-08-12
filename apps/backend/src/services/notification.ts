import nodemailer from 'nodemailer';
import { config } from '../config';

class NotificationService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    if (config.notifications.smtpHost) {
      this.transporter = nodemailer.createTransport({
        host: config.notifications.smtpHost,
        port: config.notifications.smtpPort || 587,
        secure: false,
        auth: config.notifications.smtpUser ? {
          user: config.notifications.smtpUser,
          pass: config.notifications.smtpPass
        } : undefined
      });
    }
  }

  async sendNotification(data: any) {
    console.log('Sending notification:', data);
    // Implementation for various notification types
  }

  async sendEmail(emailData: { to: string; subject: string; html?: string; text?: string }) {
    if (!this.transporter) {
      console.log('Email notification (SMTP not configured):', emailData);
      return;
    }

    await this.transporter.sendMail({
      from: config.notifications.fromEmail,
      to: emailData.to,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text
    });
  }

  async sendSlackMessage(slackData: { message: string; channel?: string; organizationId?: string }) {
    // Implementation for Slack notifications
    console.log('Slack notification:', slackData);
  }

  async sendSlack(webhookUrl: string, message: any) {
    // Implementation for Slack notifications
    console.log('Slack notification:', message);
  }
}

export { NotificationService };
export const notificationService = new NotificationService();