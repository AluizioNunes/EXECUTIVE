import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Twilio } from 'twilio';

// Interfaces para tipagem das notificações
export interface EmailNotification {
  to: string;
  subject: string;
  html: string;
  tenantId: number;
}

export interface SmsNotification {
  to: string;
  body: string;
  tenantId: number;
}

export interface InAppNotification {
  userId: number;
  title: string;
  message: string;
  tenantId: number;
}

export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  inApp: boolean;
}

@Injectable()
export class NotificationsService {
  private emailTransporter: nodemailer.Transporter;
  private twilioClient: Twilio;

  constructor() {
    // Configurar transporte de email
    this.emailTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    // Configurar cliente Twilio
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.twilioClient = new Twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN,
      );
    }
  }

  // Enviar notificação por email
  async sendEmail(notification: EmailNotification): Promise<void> {
    try {
      await this.emailTransporter.sendMail({
        from: process.env.EMAIL_USER,
        to: notification.to,
        subject: notification.subject,
        html: notification.html,
      });
      console.log(`Email enviado para ${notification.to}`);
    } catch (error) {
      console.error('Erro ao enviar email:', error);
      throw error;
    }
  }

  // Enviar notificação por SMS
  async sendSms(notification: SmsNotification): Promise<void> {
    if (!this.twilioClient) {
      console.warn('Twilio não configurado. SMS não enviado.');
      return;
    }

    try {
      await this.twilioClient.messages.create({
        body: notification.body,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: notification.to,
      });
      console.log(`SMS enviado para ${notification.to}`);
    } catch (error) {
      console.error('Erro ao enviar SMS:', error);
      throw error;
    }
  }

  // Criar notificação in-app
  async createInAppNotification(notification: InAppNotification): Promise<void> {
    try {
      // Em uma implementação real, isso salvaria no banco de dados
      console.log(`Notificação in-app criada para usuário ${notification.userId}: ${notification.title}`);
    } catch (error) {
      console.error('Erro ao criar notificação in-app:', error);
      throw error;
    }
  }

  // Enviar notificação multi-canal baseada nas preferências do usuário
  async sendMultiChannelNotification(
    userId: number,
    title: string,
    message: string,
    preferences: NotificationPreferences,
    contactInfo: { email?: string; phone?: string },
    tenantId: number,
  ): Promise<void> {
    const promises = [];

    if (preferences.email && contactInfo.email) {
      promises.push(
        this.sendEmail({
          to: contactInfo.email,
          subject: title,
          html: `<p>${message}</p>`,
          tenantId,
        }),
      );
    }

    if (preferences.sms && contactInfo.phone) {
      promises.push(
        this.sendSms({
          to: contactInfo.phone,
          body: message,
          tenantId,
        }),
      );
    }

    if (preferences.inApp) {
      promises.push(
        this.createInAppNotification({
          userId,
          title,
          message,
          tenantId,
        }),
      );
    }

    await Promise.all(promises);
  }
}