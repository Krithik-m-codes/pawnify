import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Max,
  IsArray,
} from 'class-validator';

export class UpdateOrganizationPolicyDto {
  @ApiPropertyOptional({ example: 'INR', description: 'Base Currency Code' })
  @IsOptional()
  @IsString()
  currencyCode?: string;

  @ApiPropertyOptional({ example: '₹', description: 'Currency Symbol' })
  @IsOptional()
  @IsString()
  currencySymbol?: string;

  @ApiPropertyOptional({
    example: 7,
    description: 'Default Grace Period Days',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  gracePeriodDays?: number;

  @ApiPropertyOptional({
    example: 50000,
    description: 'PAN / Mandatory ID Threshold Amount',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  panThreshold?: number;

  @ApiPropertyOptional({
    example: 2.0,
    description: 'Valuation Safety Margin Percent',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50)
  safetyMarginPercent?: number;

  @ApiPropertyOptional({
    example: 1.5,
    description: 'Default Monthly Interest Rate Percent',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  defaultInterestMonthly?: number;

  @ApiPropertyOptional({ example: 85.0, description: 'LTV Tier 1 Percent' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  ltvTier1Percent?: number;

  @ApiPropertyOptional({ example: 80.0, description: 'LTV Tier 2 Percent' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  ltvTier2Percent?: number;

  @ApiPropertyOptional({ example: 75.0, description: 'LTV Tier 3 Percent' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  ltvTier3Percent?: number;

  @ApiPropertyOptional({
    example: 250000,
    description: 'LTV Tier 1 Max Loan Amount',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  ltvTier1Max?: number;

  @ApiPropertyOptional({
    example: 500000,
    description: 'LTV Tier 2 Max Loan Amount',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  ltvTier2Max?: number;

  @ApiPropertyOptional({
    description: 'Custom LTV Tiers Array',
  })
  @IsOptional()
  @IsArray()
  ltvTiers?: Array<{ maxValue: number | null; ltvPercent: number }>;
}
