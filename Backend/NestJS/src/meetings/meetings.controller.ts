import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, UseGuards, Request } from '@nestjs/common';
import { MeetingsService } from './meetings.service';
import { Meeting } from './meeting.entity';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../auth/user.entity';

@Controller('meetings')
@UseGuards(RolesGuard)
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SECRETARY)
  async create(@Body() meetingData: Partial<Meeting>, @Request() req): Promise<Meeting> {
    // Associate the meeting with the requesting user's tenant
    return this.meetingsService.create({
      ...meetingData,
      tenant: req.user.tenant,
    });
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SECRETARY, UserRole.EXECUTIVE)
  async findAll(@Request() req): Promise<Meeting[]> {
    return this.meetingsService.findAllByTenant(req.user.tenant.id);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SECRETARY, UserRole.EXECUTIVE)
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req): Promise<Meeting> {
    return this.meetingsService.findOneByTenant(id, req.user.tenant.id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SECRETARY)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateData: Partial<Meeting>,
    @Request() req,
  ): Promise<Meeting> {
    return this.meetingsService.update(id, updateData, req.user.tenant.id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async remove(@Param('id', ParseIntPipe) id: number, @Request() req): Promise<void> {
    return this.meetingsService.remove(id, req.user.tenant.id);
  }
}