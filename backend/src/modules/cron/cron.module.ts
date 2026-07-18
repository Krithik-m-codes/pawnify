import { Module } from '@nestjs/common';
import { CronController } from './cron.controller';
import { MarketRatesModule } from '../market-rates/market-rates.module';

@Module({
  imports: [MarketRatesModule],
  controllers: [CronController],
})
export class CronModule {}
