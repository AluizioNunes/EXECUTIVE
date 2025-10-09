import { Controller, Get, Post, Body, Param, ParseIntPipe, UseGuards, Request } from '@nestjs/common';
import { SchedulingService, SchedulingConflict, ResourceAllocation } from './scheduling.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../auth/user.entity';

@Controller('scheduling')
@UseGuards(RolesGuard)
export class SchedulingController {
  constructor(private readonly schedulingService: SchedulingService) {}

  @Get('conflicts/:tenantId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SECRETARY)
  async detectConflicts(
    @Param('tenantId', ParseIntPipe) tenantId: number,
  ): Promise<SchedulingConflict[]> {
    return this.schedulingService.detectSchedulingConflicts(tenantId);
  }

  @Get('suggestions/:tenantId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SECRETARY)
  async getSuggestions(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @Request() req,
  ) {
    const meetingId = req.query.meetingId ? parseInt(req.query.meetingId, 10) : undefined;
    return this.schedulingService.suggestOptimizedSchedule(tenantId, meetingId);
  }

  @Post('resolve-conflicts/:tenantId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async resolveConflicts(
    @Param('tenantId', ParseIntPipe) tenantId: number,
  ) {
    const suggestions = await this.schedulingService.suggestOptimizedSchedule(tenantId);
    // Em uma implementação real, você aplicaria as sugestões aqui
    return {
      message: 'Conflitos identificados e soluções sugeridas',
      suggestions,
    };
  }

  @Get('resources/:tenantId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SECRETARY)
  async allocateResources(
    @Param('tenantId', ParseIntPipe) tenantId: number,
  ): Promise<ResourceAllocation[]> {
    return this.schedulingService.allocateResources(tenantId);
  }

  @Post('allocate-resources/:tenantId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async allocateResourcesForMeeting(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @Body() body: { meetingId: number },
  ) {
    // Em uma implementação real, você alocaria recursos específicos para uma reunião
    const allocations = await this.schedulingService.allocateResources(tenantId);
    const meetingAllocations = allocations.filter(a => a.meetingId === body.meetingId);
    
    return {
      message: 'Recursos alocados com sucesso',
      allocations: meetingAllocations,
    };
  }
}