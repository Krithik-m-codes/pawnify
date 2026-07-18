import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { CustomerSearchQueryDto } from './dto/customer-search-query.dto';
import { CustomerSummaryDto } from './dto/customer-summary.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Customers')
@Controller('customers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get('search')
  @ApiOperation({ summary: 'Typeahead search for customers by name or phone' })
  @ApiResponse({
    status: 200,
    description: 'Matching customers list',
    type: [CustomerSummaryDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async searchCustomers(
    @Query() queryDto: CustomerSearchQueryDto,
  ): Promise<CustomerSummaryDto[]> {
    return this.customersService.searchCustomers(queryDto.q);
  }
}
