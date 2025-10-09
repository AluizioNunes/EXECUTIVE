import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Tenant } from '../../tenants/tenant.entity';

@Injectable()
export class TenantDataGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    
    // Verificar se o tenant está presente no request
    const tenant: Tenant = request.tenant;
    if (!tenant) {
      throw new ForbiddenException('Tenant context is required to access this resource');
    }
    
    // Verificar se o tenant está ativo
    if (!tenant.isActive) {
      throw new ForbiddenException('Tenant account is inactive');
    }
    
    // Adicionar informações do tenant ao request para uso posterior
    request.tenantId = tenant.id;
    request.tenantName = tenant.name;
    
    return true;
  }
}