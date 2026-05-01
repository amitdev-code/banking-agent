import { Module } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { CustomerController } from './customer.controller';
import { CustomerRepository } from './customer.repository';
import { CustomerService } from './customer.service';

@Module({
  controllers: [CustomerController],
  providers: [CustomerService, CustomerRepository, PrismaService],
  exports: [CustomerService, CustomerRepository],
})
export class CustomerModule {}
