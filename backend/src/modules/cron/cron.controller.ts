import {
  Controller,
  Get,
  Post,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MarketRatesService } from '../market-rates/market-rates.service';
import { CronAuthGuard } from './guards/cron-auth.guard';
import { MarketRatesResponseDto } from '../market-rates/dto/market-rates-response.dto';

@ApiTags('Cron')
@Controller('cron')
@UseGuards(CronAuthGuard)
export class CronController {
  constructor(private readonly marketRatesService: MarketRatesService) {}

  @Get('update-rates')
  @ApiOperation({ summary: 'Trigger spot metal rates refresh (GET)' })
  @ApiResponse({ status: 200, type: MarketRatesResponseDto })
  async updateRatesGet(): Promise<MarketRatesResponseDto> {
    const result =
      await this.marketRatesService.fetchAndSaveLiveMetalRates();
    if (!result.success) {
      throw new HttpException(result, HttpStatus.INTERNAL_SERVER_ERROR);
    }
    return result;
  }

  @Post('update-rates')
  @ApiOperation({ summary: 'Trigger spot metal rates refresh (POST)' })
  @ApiResponse({ status: 200, type: MarketRatesResponseDto })
  async updateRatesPost(): Promise<MarketRatesResponseDto> {
    const result =
      await this.marketRatesService.fetchAndSaveLiveMetalRates();
    if (!result.success) {
      throw new HttpException(result, HttpStatus.INTERNAL_SERVER_ERROR);
    }
    return result;
  }
}
