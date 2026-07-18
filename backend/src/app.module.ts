import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { CustomersModule } from './modules/customers/customers.module';
import { MarketRatesModule } from './modules/market-rates/market-rates.module';
import { StorageModule } from './modules/storage/storage.module';
import { CronModule } from './modules/cron/cron.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    HealthModule,
    AuthModule,
    CustomersModule,
    MarketRatesModule,
    StorageModule,
    CronModule,
    WebhooksModule,
    OrganizationsModule,
  ],
})
export class AppModule {}
