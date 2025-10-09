import {
  Controller,
  Get,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditLog, AuditAction } from './audit-log.entity';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';

@Controller('audit')
@UseGuards(AuthGuard('jwt'))
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  async getAuditLogs(
    @Req() req: Request,
    @Query('limit') limit?: string,
    @Query('action') action?: string,
  ): Promise<AuditLog[]> {
    const tenantId = req.user?.['tenantId'];
    const limitNum = limit ? parseInt(limit, 10) : 50;
    
    if (action) {
      return this.auditService.getAuditLogsByAction(
        action as AuditAction,
        tenantId,
        limitNum,
      );
    }
    
    return this.auditService.getAuditLogsByTenant(tenantId, limitNum);
  }

  @Get('user/:userId')
  async getAuditLogsByUser(
    @Req() req: Request,
    @Query('userId') userId: string,
    @Query('limit') limit?: string,
  ): Promise<AuditLog[]> {
    const tenantId = req.user?.['tenantId'];
    const limitNum = limit ? parseInt(limit, 10) : 50;
    
    return this.auditService.getAuditLogsByUser(
      parseInt(userId, 10),
      limitNum,
    );
  }

  @Get('entity/:entityType/:entityId')
  async getAuditLogsByEntity(
    @Req() req: Request,
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
    @Query('limit') limit?: string,
  ): Promise<AuditLog[]> {
    const tenantId = req.user?.['tenantId'];
    const limitNum = limit ? parseInt(limit, 10) : 50;
    
    return this.auditService.getAuditLogsByEntity(
      entityType,
      parseInt(entityId, 10),
      tenantId,
      limitNum,
    );
  }

  @Get('date-range')
  async getAuditLogsByDateRange(
    @Req() req: Request,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('limit') limit?: string,
  ): Promise<AuditLog[]> {
    const tenantId = req.user?.['tenantId'];
    const limitNum = limit ? parseInt(limit, 10) : 100;
    
    return this.auditService.getAuditLogsByDateRange(
      new Date(startDate),
      new Date(endDate),
      tenantId,
      limitNum,
    );
  }
}