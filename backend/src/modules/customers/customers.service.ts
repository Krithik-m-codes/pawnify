import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { CustomersRepository } from './customers.repository';
import { CustomerSummaryDto } from './dto/customer-summary.dto';

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(private readonly customersRepository: CustomersRepository) {}

  async searchCustomers(query?: string): Promise<CustomerSummaryDto[]> {
    const q = query || '';
    if (q.length < 2) {
      return [];
    }

    try {
      return await this.customersRepository.searchCustomers(q, 10);
    } catch (error) {
      this.logger.error('Customer search error:', error);
      throw new HttpException(
        { error: 'Failed to search customers' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
