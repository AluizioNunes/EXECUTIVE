import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from './task.entity';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
  ) {}

  async create(taskData: Partial<Task>): Promise<Task> {
    const task = this.taskRepository.create(taskData);
    return this.taskRepository.save(task);
  }

  async findAllByTenant(tenantId: number): Promise<Task[]> {
    return this.taskRepository.find({ 
      where: { tenant: { id: tenantId } },
      relations: ['assignee', 'createdBy']
    });
  }

  async findOneByTenant(id: number, tenantId: number): Promise<Task> {
    const task = await this.taskRepository.findOne({ 
      where: { id, tenant: { id: tenantId } },
      relations: ['assignee', 'createdBy', 'meeting']
    });
    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found in this tenant`);
    }
    return task;
  }

  async update(id: number, updateData: Partial<Task>, tenantId: number): Promise<Task> {
    const task = await this.findOneByTenant(id, tenantId);
    Object.assign(task, updateData);
    return this.taskRepository.save(task);
  }

  async remove(id: number, tenantId: number): Promise<void> {
    const task = await this.findOneByTenant(id, tenantId);
    await this.taskRepository.remove(task);
  }
}