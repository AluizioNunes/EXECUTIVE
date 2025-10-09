import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';
import * as nodemailer from 'nodemailer';

// Interfaces para os dados
export interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  attendees?: Array<{ email: string }>;
  location?: string;
}

export interface EmailMessage {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
  }>;
}

@Injectable()
export class IntegrationsService {
  private googleCredentials: any;
  private outlookCredentials: any;

  constructor() {
    // Inicializar credenciais (em produção, isso viria de variáveis de ambiente)
    this.googleCredentials = {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI,
    };

    this.outlookCredentials = {
      clientId: process.env.OUTLOOK_CLIENT_ID,
      clientSecret: process.env.OUTLOOK_CLIENT_SECRET,
      redirectUri: process.env.OUTLOOK_REDIRECT_URI,
    };
  }

  /**
   * Configura a autenticação com o Google Calendar
   */
  async setupGoogleAuth(accessToken: string, refreshToken: string) {
    const oauth2Client = new google.auth.OAuth2(
      this.googleCredentials.clientId,
      this.googleCredentials.clientSecret,
      this.googleCredentials.redirectUri,
    );

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    return oauth2Client;
  }

  /**
   * Cria um evento no Google Calendar
   */
  async createGoogleCalendarEvent(
    accessToken: string,
    refreshToken: string,
    event: CalendarEvent,
    calendarId: string = 'primary',
  ) {
    try {
      const auth = await this.setupGoogleAuth(accessToken, refreshToken);
      const calendar = google.calendar({ version: 'v3', auth });

      const response = await calendar.events.insert({
        calendarId,
        requestBody: {
          summary: event.summary,
          description: event.description,
          start: event.start,
          end: event.end,
          attendees: event.attendees,
          location: event.location,
        },
      });

      return response.data;
    } catch (error) {
      throw new Error(`Failed to create Google Calendar event: ${error.message}`);
    }
  }

  /**
   * Lista eventos do Google Calendar
   */
  async listGoogleCalendarEvents(
    accessToken: string,
    refreshToken: string,
    calendarId: string = 'primary',
    timeMin?: string,
    timeMax?: string,
  ) {
    try {
      const auth = await this.setupGoogleAuth(accessToken, refreshToken);
      const calendar = google.calendar({ version: 'v3', auth });

      const response = await calendar.events.list({
        calendarId,
        timeMin,
        timeMax,
        singleEvents: true,
        orderBy: 'startTime',
      });

      return response.data.items || [];
    } catch (error) {
      throw new Error(`Failed to list Google Calendar events: ${error.message}`);
    }
  }

  /**
   * Atualiza um evento no Google Calendar
   */
  async updateGoogleCalendarEvent(
    accessToken: string,
    refreshToken: string,
    eventId: string,
    event: CalendarEvent,
    calendarId: string = 'primary',
  ) {
    try {
      const auth = await this.setupGoogleAuth(accessToken, refreshToken);
      const calendar = google.calendar({ version: 'v3', auth });

      const response = await calendar.events.update({
        calendarId,
        eventId,
        requestBody: {
          summary: event.summary,
          description: event.description,
          start: event.start,
          end: event.end,
          attendees: event.attendees,
          location: event.location,
        },
      });

      return response.data;
    } catch (error) {
      throw new Error(`Failed to update Google Calendar event: ${error.message}`);
    }
  }

  /**
   * Deleta um evento no Google Calendar
   */
  async deleteGoogleCalendarEvent(
    accessToken: string,
    refreshToken: string,
    eventId: string,
    calendarId: string = 'primary',
  ) {
    try {
      const auth = await this.setupGoogleAuth(accessToken, refreshToken);
      const calendar = google.calendar({ version: 'v3', auth });

      await calendar.events.delete({
        calendarId,
        eventId,
      });

      return { success: true };
    } catch (error) {
      throw new Error(`Failed to delete Google Calendar event: ${error.message}`);
    }
  }

  /**
   * Configura o transporte de email
   */
  private setupEmailTransport(service: 'gmail' | 'outlook', credentials: any) {
    if (service === 'gmail') {
      return nodemailer.createTransport({
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: credentials.email,
          clientId: this.googleCredentials.clientId,
          clientSecret: this.googleCredentials.clientSecret,
          refreshToken: credentials.refreshToken,
          accessToken: credentials.accessToken,
        },
      });
    } else if (service === 'outlook') {
      return nodemailer.createTransport({
        service: 'hotmail',
        auth: {
          user: credentials.email,
          pass: credentials.password,
        },
      });
    }

    throw new Error('Unsupported email service');
  }

  /**
   * Envia um email
   */
  async sendEmail(
    service: 'gmail' | 'outlook',
    credentials: any,
    message: EmailMessage,
  ) {
    try {
      const transporter = this.setupEmailTransport(service, credentials);

      const mailOptions = {
        from: credentials.email,
        to: Array.isArray(message.to) ? message.to.join(', ') : message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
        attachments: message.attachments,
      };

      const info = await transporter.sendMail(mailOptions);
      return info;
    } catch (error) {
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  /**
   * Sincroniza eventos entre diferentes calendários
   */
  async syncCalendars(
    sourceService: 'google' | 'outlook',
    targetService: 'google' | 'outlook',
    sourceCredentials: any,
    targetCredentials: any,
    timeMin?: string,
    timeMax?: string,
  ) {
    try {
      // Obter eventos da fonte
      let sourceEvents: any[] = [];
      
      if (sourceService === 'google') {
        sourceEvents = await this.listGoogleCalendarEvents(
          sourceCredentials.accessToken,
          sourceCredentials.refreshToken,
          'primary',
          timeMin,
          timeMax,
        );
      }

      // Processar e criar eventos no destino
      const syncedEvents = [];
      
      for (const event of sourceEvents) {
        // Converter evento para o formato do destino
        const convertedEvent: CalendarEvent = {
          summary: event.summary,
          description: event.description,
          start: event.start,
          end: event.end,
          attendees: event.attendees?.map(a => ({ email: a.email })) || [],
          location: event.location,
        };

        // Criar evento no destino
        if (targetService === 'google') {
          const syncedEvent = await this.createGoogleCalendarEvent(
            targetCredentials.accessToken,
            targetCredentials.refreshToken,
            convertedEvent,
          );
          syncedEvents.push(syncedEvent);
        }
      }

      return {
        success: true,
        syncedEventsCount: syncedEvents.length,
        syncedEvents,
      };
    } catch (error) {
      throw new Error(`Failed to sync calendars: ${error.message}`);
    }
  }
}