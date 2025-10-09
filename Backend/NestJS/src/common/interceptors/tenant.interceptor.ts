import { Injectable, NestInterceptor, ExecutionContext, CallHandler, BadRequestException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { TenantService } from '../../tenants/tenant.service';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  constructor(private readonly tenantService: TenantService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    
    // Extract tenant from subdomain or header
    const tenantId = this.extractTenantId(request);
    
    if (!tenantId) {
      throw new BadRequestException('Tenant identifier is required');
    }
    
    // Validate tenant exists
    const tenant = await this.tenantService.findOne(tenantId);
    if (!tenant || !tenant.isActive) {
      throw new BadRequestException('Invalid or inactive tenant');
    }
    
    // Attach tenant to request
    request.tenant = tenant;
    
    return next.handle();
  }

  private extractTenantId(request: any): number | null {
    // Try to get tenant from header
    if (request.headers['x-tenant-id']) {
      const tenantId = parseInt(request.headers['x-tenant-id'], 10);
      return isNaN(tenantId) ? null : tenantId;
    }
    
    // Try to get tenant from subdomain
    const host = request.headers['host'] || '';
    const subdomain = host.split('.')[0];
    if (subdomain && subdomain !== 'www' && subdomain !== 'localhost') {
      // In a real implementation, you would look up the tenant by subdomain
      // This is a simplified example
      return parseInt(subdomain, 10) || null;
    }
    
    return null;
  }
}