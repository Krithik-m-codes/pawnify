import { ApiProperty } from '@nestjs/swagger';

export class CustomerSummaryDto {
  @ApiProperty({ example: 'cust_123', description: 'Customer ID' })
  id: string;

  @ApiProperty({ example: 'John Sharma', description: 'Customer full name' })
  fullName: string;

  @ApiProperty({ example: '+919876543210', description: 'Customer phone number' })
  phone: string;

  @ApiProperty({ example: 'Mumbai', description: 'Customer city' })
  city: string;
}
