import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../auth/user.entity';

@Controller('analytics')
@UseGuards(RolesGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('executive-productivity/:tenantId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async getExecutiveProductivity(
    @Param('tenantId', ParseIntPipe) tenantId: number,
  ) {
    return this.analyticsService.getExecutiveProductivityReport(tenantId);
  }

  @Get('meeting-efficiency/:tenantId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async getMeetingEfficiency(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @Query('days') days?: string,
  ) {
    const daysNum = days ? parseInt(days, 10) : 30;
    return this.analyticsService.getMeetingEfficiencyReport(tenantId, daysNum);
  }

  @Get('task-analytics/:tenantId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async getTaskAnalytics(
    @Param('tenantId', ParseIntPipe) tenantId: number,
  ) {
    return this.analyticsService.getTaskAnalyticsReport(tenantId);
  }

  @Get('resource-utilization/:tenantId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async getResourceUtilization(
    @Param('tenantId', ParseIntPipe) tenantId: number,
  ) {
    return this.analyticsService.getResourceUtilizationReport(tenantId);
  }

  @Get('dashboard/:tenantId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async getExecutiveDashboard(
    @Param('tenantId', ParseIntPipe) tenantId: number,
  ) {
    return this.analyticsService.getExecutiveDashboardReport(tenantId);
  }
}