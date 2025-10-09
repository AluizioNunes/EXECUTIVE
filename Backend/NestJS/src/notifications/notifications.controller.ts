import { Controller, Post, Body, HttpStatus, HttpException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

// DTOs para validação dos dados de entrada
export class SendEmailDto {
  to: string;
  subject: string;
  html: string;
  tenantId: number;
}

export class SendSmsDto {
  to: string;
  body: string;
  tenantId: number;
}

export class CreateInAppNotificationDto {
  userId: number;
  title: string;
  message: string;
  tenantId: number;
}

export class SendMultiChannelDto {
  userId: number;
  title: string;
  message: string;
  preferences: {
    email: boolean;
    sms: boolean;
    inApp: boolean;
  };
  contactInfo: {
    email?: string;
    phone?: string;
  };
  tenantId: number;
}

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('email')
  async sendEmail(@Body() sendEmailDto: SendEmailDto) {
    try {
      await this.notificationsService.sendEmail(sendEmailDto);
      return {
        statusCode: HttpStatus.OK,
        message: 'Email enviado com sucesso',
      };
    } catch (error) {
      throw new HttpException(
        'Falha ao enviar email: ' + error.message,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('sms')
  async sendSms(@Body() sendSmsDto: SendSmsDto) {
    try {
      await this.notificationsService.sendSms(sendSmsDto);
      return {
        statusCode: HttpStatus.OK,
        message: 'SMS enviado com sucesso',
      };
    } catch (error) {
      throw new HttpException(
        'Falha ao enviar SMS: ' + error.message,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('in-app')
  async createInAppNotification(@Body() createInAppNotificationDto: CreateInAppNotificationDto) {
    try {
      await this.notificationsService.createInAppNotification(createInAppNotificationDto);
      return {
        statusCode: HttpStatus.OK,
        message: 'Notificação in-app criada com sucesso',
      };
    } catch (error) {
      throw new HttpException(
        'Falha ao criar notificação in-app: ' + error.message,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('multi-channel')
  async sendMultiChannelNotification(@Body() sendMultiChannelDto: SendMultiChannelDto) {
    try {
      await this.notificationsService.sendMultiChannelNotification(
        sendMultiChannelDto.userId,
        sendMultiChannelDto.title,
        sendMultiChannelDto.message,
        sendMultiChannelDto.preferences,
        sendMultiChannelDto.contactInfo,
        sendMultiChannelDto.tenantId,
      );
      return {
        statusCode: HttpStatus.OK,
        message: 'Notificações multi-canal enviadas com sucesso',
      };
    } catch (error) {
      throw new HttpException(
        'Falha ao enviar notificações multi-canal: ' + error.message,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}