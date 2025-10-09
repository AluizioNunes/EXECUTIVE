import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from './tenant.entity';

@Injectable()
export class TenantService {
  constructor(
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
  ) {}

  async create(tenantData: Partial<Tenant>): Promise<Tenant> {
    const tenant = this.tenantRepository.create(tenantData);
    return this.tenantRepository.save(tenant);
  }

  async findAll(): Promise<Tenant[]> {
    return this.tenantRepository.find();
  }

  async findOne(id: number): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({ where: { id } });
    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${id} not found`);
    }
    return tenant;
  }

  async findBySubdomain(subdomain: string): Promise<Tenant | undefined> {
    return this.tenantRepository.findOne({ where: { subdomain } });
  }

  async update(id: number, updateData: Partial<Tenant>): Promise<Tenant> {
    const tenant = await this.findOne(id);
    Object.assign(tenant, updateData);
    return this.tenantRepository.save(tenant);
  }

  async remove(id: number): Promise<void> {
    const tenant = await this.findOne(id);
    await this.tenantRepository.remove(tenant);
  }

  async getTenantStats(id: number): Promise<any> {
    const tenant = await this.findOne(id);
    
    // In a real implementation, you would query related entities to get stats
    // This is a simplified example
    return {
      tenantName: tenant.name,
      isActive: tenant.isActive,
      createdAt: tenant.createdAt,
      // Add more statistics as needed
    };
  }
}