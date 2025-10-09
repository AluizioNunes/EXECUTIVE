import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from './audit.service';
import { AuditAction } from './audit-log.entity';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    
    const startTime = Date.now();
    
    return next.handle().pipe(
      tap(() => {
        const endTime = Date.now();
        this.logRequest(request, response, endTime - startTime);
      }),
    );
  }

  private async logRequest(request: any, response: any, duration: number) {
    try {
      // Somente registrar requisições que requerem autenticação
      if (!request.user) {
        return;
      }

      // Determinar a ação com base no método HTTP
      let action: AuditAction;
      switch (request.method) {
        case 'POST':
          action = AuditAction.CREATE;
          break;
        case 'GET':
          action = AuditAction.READ;
          break;
        case 'PUT':
        case 'PATCH':
          action = AuditAction.UPDATE;
          break;
        case 'DELETE':
          action = AuditAction.DELETE;
          break;
        default:
          action = AuditAction.ACCESS;
      }

      // Extrair informações da requisição
      const urlParts = request.url.split('/');
      const entityType = urlParts[1] || 'unknown';
      const entityId = urlParts[2] ? parseInt(urlParts[2], 10) : undefined;

      // Registrar o log de auditoria
      await this.auditService.logAction({
        action,
        entityType,
        entityId,
        userId: request.user.id,
        tenantId: request.user.tenantId,
        ipAddress: request.ip,
        userAgent: request.get('User-Agent'),
        details: {
          method: request.method,
          url: request.url,
          statusCode: response.statusCode,
          duration: `${duration}ms`,
        },
        resourceUrl: request.url,
      });
    } catch (error) {
      console.error('Failed to log audit action:', error);
    }
  }
}