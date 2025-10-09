import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { Executive } from './executive.entity';
import { Tenant } from '../tenants/tenant.entity';

@Injectable()
export class ExecutivesService {
  constructor(
    @InjectRepository(Executive)
    private executiveRepository: Repository<Executive>,
  ) {}

  async create(executiveData: Partial<Executive>, tenant: Tenant): Promise<Executive> {
    const executive = this.executiveRepository.create({
      ...executiveData,
      tenant,
    });
    return this.executiveRepository.save(executive);
  }

  async findAllByTenant(tenant: Tenant): Promise<Executive[]> {
    return this.executiveRepository.find({ 
      where: { tenant: { id: tenant.id } } as FindOptionsWhere<Executive>
    });
  }

  async findOneByTenant(id: number, tenant: Tenant): Promise<Executive> {
    const executive = await this.executiveRepository.findOne({ 
      where: { id, tenant: { id: tenant.id } } as FindOptionsWhere<Executive>
    });
    if (!executive) {
      throw new NotFoundException(`Executive with ID ${id} not found in this tenant`);
    }
    return executive;
  }

  async update(id: number, updateData: Partial<Executive>, tenant: Tenant): Promise<Executive> {
    const executive = await this.findOneByTenant(id, tenant);
    Object.assign(executive, updateData);
    return this.executiveRepository.save(executive);
  }

  async remove(id: number, tenant: Tenant): Promise<void> {
    const executive = await this.findOneByTenant(id, tenant);
    await this.executiveRepository.remove(executive);
  }
}