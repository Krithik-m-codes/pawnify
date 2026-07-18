import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CustomerSearchQueryDto {
  @ApiPropertyOptional({ example: 'John', description: 'Search query for full name or phone number' })
  @IsOptional()
  @IsString()
  q?: string;
}
