import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, UseGuards, Request } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { Task } from './task.entity';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../auth/user.entity';

@Controller('tasks')
@UseGuards(RolesGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SECRETARY)
  async create(@Body() taskData: Partial<Task>, @Request() req): Promise<Task> {
    // Associate the task with the requesting user's tenant
    return this.tasksService.create({
      ...taskData,
      tenant: req.user.tenant,
    });
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SECRETARY, UserRole.EXECUTIVE)
  async findAll(@Request() req): Promise<Task[]> {
    return this.tasksService.findAllByTenant(req.user.tenant.id);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SECRETARY, UserRole.EXECUTIVE)
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req): Promise<Task> {
    return this.tasksService.findOneByTenant(id, req.user.tenant.id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SECRETARY)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateData: Partial<Task>,
    @Request() req,
  ): Promise<Task> {
    return this.tasksService.update(id, updateData, req.user.tenant.id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async remove(@Param('id', ParseIntPipe) id: number, @Request() req): Promise<void> {
    return this.tasksService.remove(id, req.user.tenant.id);
  }
}