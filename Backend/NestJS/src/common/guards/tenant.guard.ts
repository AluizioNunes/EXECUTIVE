import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    
    // Check if tenant is attached to request
    if (!request.tenant) {
      throw new ForbiddenException('Tenant context is required');
    }
    
    // In a more complex implementation, you could check additional permissions here
    // For example, verify that the user has access to this tenant
    
    return true;
  }
}