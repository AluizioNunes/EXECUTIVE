import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { IntegrationsService, CalendarEvent, EmailMessage } from './integrations.service';

@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Post('google-calendar/event')
  async createGoogleCalendarEvent(
    @Body() body: { 
      accessToken: string; 
      refreshToken: string; 
      event: CalendarEvent;
      calendarId?: string;
    },
  ) {
    return this.integrationsService.createGoogleCalendarEvent(
      body.accessToken,
      body.refreshToken,
      body.event,
      body.calendarId,
    );
  }

  @Get('google-calendar/events')
  async listGoogleCalendarEvents(
    @Query('accessToken') accessToken: string,
    @Query('refreshToken') refreshToken: string,
    @Query('calendarId') calendarId?: string,
    @Query('timeMin') timeMin?: string,
    @Query('timeMax') timeMax?: string,
  ) {
    return this.integrationsService.listGoogleCalendarEvents(
      accessToken,
      refreshToken,
      calendarId,
      timeMin,
      timeMax,
    );
  }

  @Post('google-calendar/event/update')
  async updateGoogleCalendarEvent(
    @Body() body: { 
      accessToken: string; 
      refreshToken: string; 
      eventId: string;
      event: CalendarEvent;
      calendarId?: string;
    },
  ) {
    return this.integrationsService.updateGoogleCalendarEvent(
      body.accessToken,
      body.refreshToken,
      body.eventId,
      body.event,
      body.calendarId,
    );
  }

  @Post('google-calendar/event/delete')
  async deleteGoogleCalendarEvent(
    @Body() body: { 
      accessToken: string; 
      refreshToken: string; 
      eventId: string;
      calendarId?: string;
    },
  ) {
    return this.integrationsService.deleteGoogleCalendarEvent(
      body.accessToken,
      body.refreshToken,
      body.eventId,
      body.calendarId,
    );
  }

  @Post('email/send')
  async sendEmail(
    @Body() body: { 
      service: 'gmail' | 'outlook'; 
      credentials: any; 
      message: EmailMessage;
    },
  ) {
    return this.integrationsService.sendEmail(
      body.service,
      body.credentials,
      body.message,
    );
  }

  @Post('calendars/sync')
  async syncCalendars(
    @Body() body: { 
      sourceService: 'google' | 'outlook'; 
      targetService: 'google' | 'outlook';
      sourceCredentials: any;
      targetCredentials: any;
      timeMin?: string;
      timeMax?: string;
    },
  ) {
    return this.integrationsService.syncCalendars(
      body.sourceService,
      body.targetService,
      body.sourceCredentials,
      body.targetCredentials,
      body.timeMin,
      body.timeMax,
    );
  }
}