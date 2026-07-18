import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface AppSettingRecord {
  key: string;
  value: string;
}

@Injectable()
export class MarketRatesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getSettingsByKeys(keys: string[]): Promise<AppSettingRecord[]> {
    return this.prisma.appSetting.findMany({
      where: {
        key: {
          in: keys,
        },
      },
    });
  }

  async upsertSetting(key: string, value: string): Promise<void> {
    await this.prisma.appSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }
}
