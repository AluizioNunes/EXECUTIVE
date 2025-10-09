import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { MonitoringService } from './monitoring.service';
import { MonitoringLog, LogType, LogSource } from './monitoring-log.entity';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';

@Controller('monitoring')
@UseGuards(AuthGuard('jwt'))
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  @Post('log')
  async createLog(
    @Body() body: { 
      logType: LogType; 
      logSource: LogSource; 
      message: string; 
      details?: any 
    },
    @Req() req: Request,
  ): Promise<MonitoringLog> {
    const tenantId = req.user?.['tenantId'];
    const userId = req.user?.['id'];
    const ipAddress = req.ip;
    const userAgent = req.get('User-Agent');

    return this.monitoringService.log({
      logType: body.logType,
      logSource: body.logSource,
      message: body.message,
      details: body.details,
      tenantId,
      userId,
      ipAddress,
      userAgent,
    });
  }

  @Get('logs')
  async getLogs(
    @Req() req: Request,
    @Query('logType') logType?: LogType,
    @Query('logSource') logSource?: LogSource,
    @Query('limit') limit?: string,
  ): Promise<MonitoringLog[]> {
    const tenantId = req.user?.['tenantId'];
    const limitNum = limit ? parseInt(limit, 10) : 100;

    return this.monitoringService.getLogs(
      logType as LogType,
      logSource as LogSource,
      tenantId,
      limitNum,
    );
  }

  @Get('errors')
  async getErrorLogs(
    @Req() req: Request,
    @Query('limit') limit?: string,
  ): Promise<MonitoringLog[]> {
    const tenantId = req.user?.['tenantId'];
    const limitNum = limit ? parseInt(limit, 10) : 50;

    return this.monitoringService.getErrorLogs(tenantId, limitNum);
  }

  @Get('metrics')
  async getSystemMetrics(): Promise<any> {
    return this.monitoringService.getSystemMetrics();
  }

  @Get('logs/date-range')
  async getLogsByDateRange(
    @Req() req: Request,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('limit') limit?: string,
  ): Promise<MonitoringLog[]> {
    const tenantId = req.user?.['tenantId'];
    const limitNum = limit ? parseInt(limit, 10) : 100;

    return this.monitoringService.getLogsByDateRange(
      new Date(startDate),
      new Date(endDate),
      tenantId,
      limitNum,
    );
  }
}