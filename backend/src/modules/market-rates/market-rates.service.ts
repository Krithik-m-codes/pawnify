import { Injectable, Logger } from '@nestjs/common';
import { MarketRatesRepository } from './market-rates.repository';
import {
  MarketRatesDto,
  MarketRatesResponseDto,
} from './dto/market-rates-response.dto';

@Injectable()
export class MarketRatesService {
  private readonly logger = new Logger(MarketRatesService.name);

  constructor(private readonly repository: MarketRatesRepository) {}

  private getConfiguredDefaults(): MarketRatesDto {
    return {
      goldRatePerGram: parseFloat(process.env.DEFAULT_GOLD_RATE_PER_GRAM || '0'),
      silverRatePerGram: parseFloat(process.env.DEFAULT_SILVER_RATE_PER_GRAM || '0'),
      lastUpdated: 'Live market derivation pending',
      safetyMarginPercent: parseFloat(
        process.env.VALUATION_SAFETY_MARGIN_PERCENT || '0',
      ),
      source: 'Configured Environment Instance',
      ltvTier1Percent: parseFloat(process.env.LTV_TIER1_PERCENT || '85.0'),
      ltvTier2Percent: parseFloat(process.env.LTV_TIER2_PERCENT || '80.0'),
      ltvTier3Percent: parseFloat(process.env.LTV_TIER3_PERCENT || '75.0'),
      ltvTier1Max: parseFloat(process.env.LTV_TIER1_MAX || '250000'),
      ltvTier2Max: parseFloat(process.env.LTV_TIER2_MAX || '500000'),
      defaultInterestMonthly: parseFloat(
        process.env.DEFAULT_INTEREST_MONTHLY || '1.5',
      ),
      defaultGraceDays: parseFloat(process.env.DEFAULT_GRACE_DAYS || '7'),
      panThreshold: parseFloat(process.env.PAN_THRESHOLD || '50000'),
    };
  }

  async getMarketRates(): Promise<MarketRatesDto> {
    const defaults = this.getConfiguredDefaults();
    try {
      const keys = [
        'rate.gold.per_gram',
        'rate.silver.per_gram',
        'rate.last_updated',
        'valuation.safety.margin',
        'ltv.tier1.percent',
        'ltv.tier2.percent',
        'ltv.tier3.percent',
        'ltv.tier1.max',
        'ltv.tier2.max',
        'interest.default.monthly',
        'grace.period.days',
        'pan.threshold',
      ];
      const settings = await this.repository.getSettingsByKeys(keys);
      const map = new Map(settings.map((s) => [s.key, s.value]));

      const gold =
        parseFloat(map.get('rate.gold.per_gram') || '') ||
        defaults.goldRatePerGram;
      const silver =
        parseFloat(map.get('rate.silver.per_gram') || '') ||
        defaults.silverRatePerGram;
      const updated = map.get('rate.last_updated') || defaults.lastUpdated;
      const margin =
        parseFloat(map.get('valuation.safety.margin') || '') ||
        defaults.safetyMarginPercent;

      return {
        goldRatePerGram: gold,
        silverRatePerGram: silver,
        lastUpdated: updated,
        safetyMarginPercent: margin,
        source: updated.includes('pending')
          ? 'Configured Instance'
          : 'Live Market Cache',
        ltvTier1Percent:
          parseFloat(map.get('ltv.tier1.percent') || '') ||
          defaults.ltvTier1Percent,
        ltvTier2Percent:
          parseFloat(map.get('ltv.tier2.percent') || '') ||
          defaults.ltvTier2Percent,
        ltvTier3Percent:
          parseFloat(map.get('ltv.tier3.percent') || '') ||
          defaults.ltvTier3Percent,
        ltvTier1Max:
          parseFloat(map.get('ltv.tier1.max') || '') || defaults.ltvTier1Max,
        ltvTier2Max:
          parseFloat(map.get('ltv.tier2.max') || '') || defaults.ltvTier2Max,
        defaultInterestMonthly:
          parseFloat(map.get('interest.default.monthly') || '') ||
          defaults.defaultInterestMonthly,
        defaultGraceDays:
          parseFloat(map.get('grace.period.days') || '') ||
          defaults.defaultGraceDays,
        panThreshold:
          parseFloat(map.get('pan.threshold') || '') || defaults.panThreshold,
      };
    } catch (err) {
      this.logger.error('Error fetching market rates from DB:', err);
      return defaults;
    }
  }

  async fetchAndSaveLiveMetalRates(): Promise<MarketRatesResponseDto> {
    const defaults = this.getConfiguredDefaults();
    let goldRate = defaults.goldRatePerGram;
    let silverRate = defaults.silverRatePerGram;
    let source = 'Configured Instance Estimate';
    let fetchSuccess = false;

    // Primary Market API: GoldPrice Live Spot
    try {
      const res = await fetch('https://data-asg.goldprice.org/dbXRates/INR', {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.items && data.items.length > 0) {
          const item = data.items[0];
          if (item.xauPrice && item.xagPrice) {
            goldRate = Number((item.xauPrice / 31.1034768).toFixed(2));
            silverRate = Number((item.xagPrice / 31.1034768).toFixed(2));
            source = 'Live Spot Market API (Primary INR Spot)';
            fetchSuccess = true;
          }
        }
      }
    } catch {
      this.logger.warn('Primary spot API fetch failed, trying secondary market source');
    }

    // Secondary Market API: OpenER Exchange Rate + GoldAPI Spot
    if (!fetchSuccess) {
      try {
        const [fxRes, goldRes, silverRes] = await Promise.all([
          fetch('https://open.er-api.com/v6/latest/USD'),
          fetch('https://api.gold-api.com/price/XAU'),
          fetch('https://api.gold-api.com/price/XAG'),
        ]);

        if (fxRes.ok && goldRes.ok && silverRes.ok) {
          const fxData = await fxRes.json();
          const goldData = await goldRes.json();
          const silverData = await silverRes.json();

          const inrPerUsd = fxData?.rates?.INR;
          if (inrPerUsd && goldData?.price && silverData?.price) {
            const goldInrTroyOz = goldData.price * inrPerUsd;
            const silverInrTroyOz = silverData.price * inrPerUsd;

            goldRate = Number((goldInrTroyOz / 31.1034768).toFixed(2));
            silverRate = Number((silverInrTroyOz / 31.1034768).toFixed(2));
            source = 'Live Spot Market API (Secondary Spot USD/INR)';
            fetchSuccess = true;
          }
        }
      } catch {
        this.logger.warn('Secondary spot API fetch failed, falling back to cached DB rate');
      }
    }

    // Offline Cache Fallback from Database
    if (!fetchSuccess) {
      const existing = await this.getMarketRates();
      if (existing.goldRatePerGram > 0) {
        goldRate = existing.goldRatePerGram;
        silverRate = existing.silverRatePerGram;
        source = 'Cached Spot Market Rate';
      }
    }

    const timestamp = `${new Date().toISOString()} IST`;

    try {
      await Promise.all([
        this.repository.upsertSetting('rate.gold.per_gram', goldRate.toString()),
        this.repository.upsertSetting(
          'rate.silver.per_gram',
          silverRate.toString(),
        ),
        this.repository.upsertSetting(
          'rate.last_updated',
          `${timestamp} (${source})`,
        ),
      ]);

      const updatedRates = await this.getMarketRates();
      return { success: true, rates: updatedRates };
    } catch (dbErr) {
      this.logger.error('Failed to save updated metal rates to DB:', dbErr);
      return {
        success: false,
        rates: {
          ...defaults,
          goldRatePerGram: goldRate,
          silverRatePerGram: silverRate,
          lastUpdated: timestamp,
          source,
        },
      };
    }
  }
}
