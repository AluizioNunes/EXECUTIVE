import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Tenant } from '../../tenants/tenant.entity';

@Injectable()
export class TenantDataIsolationInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    
    // Extrair o tenant do request (adicionado pelo TenantInterceptor)
    const tenant: Tenant = request.tenant;
    
    // Adicionar o tenant ID a todos os parâmetros de consulta
    // Isso garante que todas as consultas sejam filtradas automaticamente pelo tenant
    if (tenant && request.query) {
      request.query.tenantId = tenant.id;
    }
    
    // Para operações de criação, garantir que o tenant seja associado
    if (tenant && request.body && context.getHandler().name === 'create') {
      request.body.tenantId = tenant.id;
    }
    
    return next.handle();
  }
}