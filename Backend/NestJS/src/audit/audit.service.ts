import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { AuditLog, AuditAction } from './audit-log.entity';
import { Tenant } from '../tenants/tenant.entity';
import { User } from '../auth/user.entity';

export interface CreateAuditLogDto {
  action: AuditAction;
  entityType: string;
  entityId?: number;
  userId: number;
  tenantId: number;
  ipAddress?: string;
  userAgent?: string;
  details?: any;
  resourceUrl?: string;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) {}

  async logAction(createAuditLogDto: CreateAuditLogDto): Promise<AuditLog> {
    const auditLog = this.auditLogRepository.create(createAuditLogDto);
    return this.auditLogRepository.save(auditLog);
  }

  async getAuditLogsByTenant(tenantId: number, limit = 50): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getAuditLogsByUser(userId: number, limit = 50): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getAuditLogsByAction(action: AuditAction, tenantId: number, limit = 50): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: { action, tenantId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getAuditLogsByEntity(entityType: string, entityId: number, tenantId: number, limit = 50): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: { entityType, entityId, tenantId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getAuditLogsByDateRange(
    startDate: Date,
    endDate: Date,
    tenantId: number,
    limit = 100,
  ): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: {
        createdAt: Between(startDate, endDate),
        tenantId,
      },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}