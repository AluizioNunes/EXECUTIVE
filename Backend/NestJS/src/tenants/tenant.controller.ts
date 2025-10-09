import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, UseGuards, Request } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { Tenant } from './tenant.entity';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../auth/user.entity';

@Controller('tenants')
@UseGuards(RolesGuard)
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  async create(@Body() tenantData: Partial<Tenant>, @Request() req): Promise<Tenant> {
    // Associate the tenant with the requesting user's tenant for multi-tenancy
    return this.tenantService.create(tenantData);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  async findAll(): Promise<Tenant[]> {
    return this.tenantService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Tenant> {
    return this.tenantService.findOne(id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateData: Partial<Tenant>,
  ): Promise<Tenant> {
    return this.tenantService.update(id, updateData);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.tenantService.remove(id);
  }

  @Get(':id/stats')
  @Roles(UserRole.ADMIN)
  async getTenantStats(@Param('id', ParseIntPipe) id: number): Promise<any> {
    // Return tenant statistics
    return this.tenantService.getTenantStats(id);
  }
}