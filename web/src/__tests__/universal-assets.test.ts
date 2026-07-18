import { describe, it, expect } from "vitest";
import { WORLDWIDE_JURISDICTIONS, getJurisdictionProfile, formatUniversalCurrency } from "@/lib/config/jurisdictions";
import { UNIVERSAL_ASSET_CATEGORIES, getAssetCategory } from "@/lib/config/asset-categories";

describe("Universal Worldwide Jurisdiction Registry", () => {
  it("provides institutional profiles for all major global markets", () => {
    expect(WORLDWIDE_JURISDICTIONS.US.currencyCode).toBe("USD");
    expect(WORLDWIDE_JURISDICTIONS.GB.currencySymbol).toBe("£");
    expect(WORLDWIDE_JURISDICTIONS.EU.currencySymbol).toBe("€");
    expect(WORLDWIDE_JURISDICTIONS.AE.currencySymbol).toBe("د.إ");
    expect(WORLDWIDE_JURISDICTIONS.CH.currencyCode).toBe("CHF");
    expect(WORLDWIDE_JURISDICTIONS.SG.currencySymbol).toBe("S$");
    expect(WORLDWIDE_JURISDICTIONS.AU.currencySymbol).toBe("A$");
    expect(WORLDWIDE_JURISDICTIONS.CA.currencySymbol).toBe("C$");
    expect(WORLDWIDE_JURISDICTIONS.IN.currencySymbol).toBe("₹");
    expect(WORLDWIDE_JURISDICTIONS.SA.currencySymbol).toBe("﷼");
    expect(WORLDWIDE_JURISDICTIONS.JP.currencySymbol).toBe("¥");
  });

  it("returns GLOBAL fallback when jurisdiction code is null or unrecognized", () => {
    const profile = getJurisdictionProfile("NON_EXISTENT_COUNTRY");
    expect(profile.code).toBe("GLOBAL");
    expect(profile.currencyCode).toBe("USD");
  });

  it("formats currency cleanly across different codes", () => {
    const formattedUSD = formatUniversalCurrency(25000, "USD", "en-US");
    expect(formattedUSD).toContain("25,000");

    const formattedGBP = formatUniversalCurrency(1250.5, "GBP", "en-GB");
    expect(formattedGBP).toContain("1,250.50");
  });
});

describe("Universal Collateral Asset Categories Registry", () => {
  it("supports all 6 institutional collateral categories beyond precious metals", () => {
    const metals = getAssetCategory("PRECIOUS_METALS");
    expect(metals.defaultLtvPercent).toBe(80);
    expect(metals.appraisalFields).toContain("Metal Type (Gold/Silver/Pt)");

    const watches = getAssetCategory("LUXURY_WATCHES");
    expect(watches.defaultLtvPercent).toBe(65);
    expect(watches.appraisalFields).toContain("Serial Number");

    const art = getAssetCategory("FINE_ART_COLLECTIBLES");
    expect(art.defaultLtvPercent).toBe(50);
    expect(art.appraisalFields).toContain("Provenance Documentation");

    const vehicles = getAssetCategory("VEHICLES_EQUIPMENT");
    expect(vehicles.defaultLtvPercent).toBe(55);
    expect(vehicles.appraisalFields).toContain("VIN / Chassis Number");

    const luxury = getAssetCategory("LUXURY_GOODS");
    expect(luxury.defaultLtvPercent).toBe(60);
    expect(luxury.appraisalFields).toContain("Brand & Collection");

    const general = getAssetCategory("GENERAL_COLLATERAL");
    expect(general.defaultLtvPercent).toBe(50);
  });
});
