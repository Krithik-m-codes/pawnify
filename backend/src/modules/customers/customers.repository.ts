import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CustomerSummaryDto } from './dto/customer-summary.dto';

@Injectable()
export class CustomersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async searchCustomers(
    query: string,
    limit = 10,
  ): Promise<CustomerSummaryDto[]> {
    return this.prisma.customer.findMany({
      where: {
        OR: [
          { fullName: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        fullName: true,
        phone: true,
        city: true,
      },
      orderBy: { fullName: 'asc' },
      take: limit,
    });
  }
}
