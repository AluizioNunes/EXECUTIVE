import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { MonitoringService } from './monitoring.service';
import { LogType, LogSource } from './monitoring-log.entity';

@Injectable()
export class MonitoringInterceptor implements NestInterceptor {
  constructor(private readonly monitoringService: MonitoringService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    
    const startTime = Date.now();
    
    return next.handle().pipe(
      tap(() => {
        const endTime = Date.now();
        this.logRequest(request, response, endTime - startTime);
      }),
      catchError((error) => {
        const endTime = Date.now();
        this.logError(request, response, error, endTime - startTime);
        throw error;
      }),
    );
  }

  private async logRequest(request: any, response: any, duration: number) {
    try {
      // Determinar a fonte do log com base na URL
      const logSource = this.determineLogSource(request.url);

      // Registrar o log de monitoramento
      await this.monitoringService.log({
        logType: LogType.INFO,
        logSource,
        message: `HTTP ${request.method} ${request.url} - ${response.statusCode}`,
        tenantId: request.user?.['tenantId'],
        userId: request.user?.['id'],
        ipAddress: request.ip,
        userAgent: request.get('User-Agent'),
        details: {
          method: request.method,
          url: request.url,
          statusCode: response.statusCode,
          duration: `${duration}ms`,
          params: request.params,
          query: request.query,
        },
      });
    } catch (error) {
      console.error('Failed to log monitoring info:', error);
    }
  }

  private async logError(request: any, response: any, error: any, duration: number) {
    try {
      // Determinar a fonte do log com base na URL
      const logSource = this.determineLogSource(request.url);

      // Registrar o log de erro
      await this.monitoringService.log({
        logType: LogType.ERROR,
        logSource,
        message: `HTTP ${request.method} ${request.url} - ${error.message}`,
        tenantId: request.user?.['tenantId'],
        userId: request.user?.['id'],
        ipAddress: request.ip,
        userAgent: request.get('User-Agent'),
        details: {
          method: request.method,
          url: request.url,
          statusCode: response.statusCode,
          duration: `${duration}ms`,
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
          },
        },
      });
    } catch (logError) {
      console.error('Failed to log monitoring error:', logError);
    }
  }

  private determineLogSource(url: string): LogSource {
    if (url.includes('/auth')) return LogSource.AUTH;
    if (url.includes('/tenants')) return LogSource.TENANT;
    if (url.includes('/scheduling')) return LogSource.SCHEDULING;
    if (url.includes('/notifications')) return LogSource.NOTIFICATIONS;
    if (url.includes('/integrations')) return LogSource.INTEGRATIONS;
    if (url.includes('/documents')) return LogSource.DOCUMENTS;
    if (url.includes('/compliance')) return LogSource.COMPLIANCE;
    if (url.includes('/audit')) return LogSource.AUDIT;
    return LogSource.SYSTEM;
  }
}