import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Meeting } from './meeting.entity';

@Injectable()
export class MeetingsService {
  constructor(
    @InjectRepository(Meeting)
    private meetingRepository: Repository<Meeting>,
  ) {}

  async create(meetingData: Partial<Meeting>): Promise<Meeting> {
    const meeting = this.meetingRepository.create(meetingData);
    return this.meetingRepository.save(meeting);
  }

  async findAllByTenant(tenantId: number): Promise<Meeting[]> {
    return this.meetingRepository.find({ 
      where: { tenant: { id: tenantId } },
      relations: ['executive', 'organizer']
    });
  }

  async findOneByTenant(id: number, tenantId: number): Promise<Meeting> {
    const meeting = await this.meetingRepository.findOne({ 
      where: { id, tenant: { id: tenantId } },
      relations: ['executive', 'organizer', 'attendees']
    });
    if (!meeting) {
      throw new NotFoundException(`Meeting with ID ${id} not found in this tenant`);
    }
    return meeting;
  }

  async update(id: number, updateData: Partial<Meeting>, tenantId: number): Promise<Meeting> {
    const meeting = await this.findOneByTenant(id, tenantId);
    Object.assign(meeting, updateData);
    return this.meetingRepository.save(meeting);
  }

  async remove(id: number, tenantId: number): Promise<void> {
    const meeting = await this.findOneByTenant(id, tenantId);
    await this.meetingRepository.remove(meeting);
  }
}