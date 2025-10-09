import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, UseGuards, Request } from '@nestjs/common';
import { ExecutivesService } from './executives.service';
import { Executive } from './executive.entity';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../auth/user.entity';
import { Tenant } from '../tenants/tenant.entity';

@Controller('executives')
@UseGuards(RolesGuard)
export class ExecutivesController {
  constructor(private readonly executivesService: ExecutivesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async create(@Body() executiveData: Partial<Executive>, @Request() req): Promise<Executive> {
    const tenant: Tenant = req.tenant;
    return this.executivesService.create(executiveData, tenant);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SECRETARY)
  async findAll(@Request() req): Promise<Executive[]> {
    const tenant: Tenant = req.tenant;
    return this.executivesService.findAllByTenant(tenant);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SECRETARY)
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req): Promise<Executive> {
    const tenant: Tenant = req.tenant;
    return this.executivesService.findOneByTenant(id, tenant);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateData: Partial<Executive>,
    @Request() req,
  ): Promise<Executive> {
    const tenant: Tenant = req.tenant;
    return this.executivesService.update(id, updateData, tenant);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async remove(@Param('id', ParseIntPipe) id: number, @Request() req): Promise<void> {
    const tenant: Tenant = req.tenant;
    return this.executivesService.remove(id, tenant);
  }
}