import { Controller, Get, Param, Query } from '@nestjs/common';

import type { SessionUser } from '@banking-crm/types';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CustomerQueryDto } from './dto/customer-query.dto';
import { CustomerService } from './customer.service';

@Controller('customers')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Get()
  findAll(
    @CurrentUser() user: SessionUser,
    @Query() query: CustomerQueryDto,
  ) {
    return this.customerService.findAll(user.tenantId, query);
  }

  @Get(':id')
  findById(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
  ) {
    return this.customerService.findById(user.tenantId, id);
  }
}
