import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MarketRatesService } from './market-rates.service';
import { MarketRatesResponseDto } from './dto/market-rates-response.dto';

@ApiTags('Market Rates')
@Controller('market-rates')
export class MarketRatesController {
  constructor(private readonly marketRatesService: MarketRatesService) {}

  @Get()
  @ApiOperation({ summary: 'Get cached spot metal rates and LTV parameters' })
  @ApiResponse({
    status: 200,
    description: 'Current metal valuation rates',
    type: MarketRatesResponseDto,
  })
  async getRates(): Promise<MarketRatesResponseDto> {
    try {
      const rates = await this.marketRatesService.getMarketRates();
      return { success: true, rates };
    } catch (err) {
      throw new HttpException(
        { success: false, error: 'Failed to fetch market rates' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
