import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MonitoringLog, LogType, LogSource } from './monitoring-log.entity';

export interface CreateLogDto {
  logType: LogType;
  logSource: LogSource;
  message: string;
  tenantId?: number;
  userId?: number;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);

  constructor(
    @InjectRepository(MonitoringLog)
    private monitoringLogRepository: Repository<MonitoringLog>,
  ) {}

  async log(createLogDto: CreateLogDto): Promise<MonitoringLog> {
    try {
      const log = this.monitoringLogRepository.create(createLogDto);
      const savedLog = await this.monitoringLogRepository.save(log);
      
      // Também logar no console para desenvolvimento
      this.logToConsole(createLogDto);
      
      return savedLog;
    } catch (error) {
      // Se falhar ao salvar no banco, ainda logar no console
      this.logger.error(`Failed to save log to database: ${error.message}`, error.stack);
      this.logToConsole(createLogDto);
      throw error;
    }
  }

  private logToConsole(createLogDto: CreateLogDto) {
    const logMessage = `[${createLogDto.logSource}] ${createLogDto.message}`;
    const logDetails = createLogDto.details ? JSON.stringify(createLogDto.details) : '';

    switch (createLogDto.logType) {
      case LogType.INFO:
        this.logger.log(`${logMessage} ${logDetails}`);
        break;
      case LogType.WARN:
        this.logger.warn(`${logMessage} ${logDetails}`);
        break;
      case LogType.ERROR:
        this.logger.error(`${logMessage} ${logDetails}`);
        break;
      case LogType.DEBUG:
        this.logger.debug(`${logMessage} ${logDetails}`);
        break;
    }
  }

  async getLogs(
    logType?: LogType,
    logSource?: LogSource,
    tenantId?: number,
    limit = 100,
  ): Promise<MonitoringLog[]> {
    const queryBuilder = this.monitoringLogRepository.createQueryBuilder('log');

    if (logType) {
      queryBuilder.andWhere('log.logType = :logType', { logType });
    }

    if (logSource) {
      queryBuilder.andWhere('log.logSource = :logSource', { logSource });
    }

    if (tenantId) {
      queryBuilder.andWhere('log.tenantId = :tenantId', { tenantId });
    }

    return queryBuilder
      .orderBy('log.createdAt', 'DESC')
      .limit(limit)
      .getMany();
  }

  async getErrorLogs(tenantId?: number, limit = 50): Promise<MonitoringLog[]> {
    return this.getLogs(LogType.ERROR, undefined, tenantId, limit);
  }

  async getLogsByDateRange(
    startDate: Date,
    endDate: Date,
    tenantId?: number,
    limit = 100,
  ): Promise<MonitoringLog[]> {
    const queryBuilder = this.monitoringLogRepository.createQueryBuilder('log');

    queryBuilder.andWhere('log.createdAt BETWEEN :startDate AND :endDate', {
      startDate,
      endDate,
    });

    if (tenantId) {
      queryBuilder.andWhere('log.tenantId = :tenantId', { tenantId });
    }

    return queryBuilder
      .orderBy('log.createdAt', 'DESC')
      .limit(limit)
      .getMany();
  }

  async getSystemMetrics(): Promise<any> {
    // Métricas básicas do sistema
    const totalLogs = await this.monitoringLogRepository.count();
    const errorLogs = await this.monitoringLogRepository.count({
      where: { logType: LogType.ERROR },
    });
    const warningLogs = await this.monitoringLogRepository.count({
      where: { logType: LogType.WARN },
    });

    // Logs por fonte
    const logsBySource = await this.monitoringLogRepository
      .createQueryBuilder('log')
      .select('log.logSource', 'source')
      .addSelect('COUNT(log.id)', 'count')
      .groupBy('log.logSource')
      .getRawMany();

    // Logs por tipo
    const logsByType = await this.monitoringLogRepository
      .createQueryBuilder('log')
      .select('log.logType', 'type')
      .addSelect('COUNT(log.id)', 'count')
      .groupBy('log.logType')
      .getRawMany();

    return {
      totalLogs,
      errorLogs,
      warningLogs,
      errorRate: totalLogs > 0 ? (errorLogs / totalLogs) * 100 : 0,
      logsBySource,
      logsByType,
    };
  }
}