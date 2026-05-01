import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { CustomerRepository } from './customer.repository';
import type { CustomerQueryDto } from './dto/customer-query.dto';

@Injectable()
export class CustomerService {
  private readonly logger = new Logger(CustomerService.name);

  constructor(private readonly repository: CustomerRepository) {}

  async findAll(tenantId: string, query: CustomerQueryDto) {
    return this.repository.findAll(tenantId, query);
  }

  async findById(tenantId: string, id: string) {
    const customer = await this.repository.findById(tenantId, id);
    if (!customer) throw new NotFoundException(`Customer ${id} not found`);
    return customer;
  }
}
