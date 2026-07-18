import { Module } from '@nestjs/common';
import { MarketRatesController } from './market-rates.controller';
import { MarketRatesService } from './market-rates.service';
import { MarketRatesRepository } from './market-rates.repository';

@Module({
  controllers: [MarketRatesController],
  providers: [MarketRatesService, MarketRatesRepository],
  exports: [MarketRatesService],
})
export class MarketRatesModule {}
