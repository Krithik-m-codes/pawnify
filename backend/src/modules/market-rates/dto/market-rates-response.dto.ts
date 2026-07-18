import { ApiProperty } from '@nestjs/swagger';

export class MarketRatesDto {
  @ApiProperty({ example: 7850.0, description: '24K Gold Rate in ₹/gram' })
  goldRatePerGram: number;

  @ApiProperty({ example: 98.5, description: 'Fine Silver Rate in ₹/gram' })
  silverRatePerGram: number;

  @ApiProperty({ example: '2026-07-10 12:00:00 IST', description: 'Last update timestamp' })
  lastUpdated: string;

  @ApiProperty({ example: 0, description: 'Safety margin haircut percentage' })
  safetyMarginPercent: number;

  @ApiProperty({ example: 'Cached DB Setting', description: 'Rate source' })
  source: string;

  @ApiProperty({ example: 85.0 })
  ltvTier1Percent: number;

  @ApiProperty({ example: 80.0 })
  ltvTier2Percent: number;

  @ApiProperty({ example: 75.0 })
  ltvTier3Percent: number;

  @ApiProperty({ example: 250000 })
  ltvTier1Max: number;

  @ApiProperty({ example: 500000 })
  ltvTier2Max: number;

  @ApiProperty({ example: 1.5 })
  defaultInterestMonthly: number;

  @ApiProperty({ example: 7 })
  defaultGraceDays: number;

  @ApiProperty({ example: 50000 })
  panThreshold: number;
}

export class MarketRatesResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: MarketRatesDto })
  rates: MarketRatesDto;
}
