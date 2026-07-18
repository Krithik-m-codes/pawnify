/**
 * Universal Collateral Asset Categories Registry
 *
 * Expands Pawnify from precious metals into a full institutional asset-backed
 * lending platform supporting watches, fine art, vehicles, electronics, and general collateral.
 */

export type AssetCategoryId =
  | "PRECIOUS_METALS"
  | "LUXURY_WATCHES"
  | "FINE_ART_COLLECTIBLES"
  | "VEHICLES_EQUIPMENT"
  | "LUXURY_GOODS"
  | "GENERAL_COLLATERAL";

export interface AssetCategoryConfig {
  id: AssetCategoryId;
  name: string;
  badge: string;
  description: string;
  defaultLtvPercent: number;
  appraisalFields: string[];
  exampleItems: string[];
}

export const UNIVERSAL_ASSET_CATEGORIES: Record<AssetCategoryId, AssetCategoryConfig> = {
  PRECIOUS_METALS: {
    id: "PRECIOUS_METALS",
    name: "Precious Metals & Bullion",
    badge: "BULLION & JEWELRY",
    description: "Gold, Silver, Platinum, and Palladium bullion bars, coins, and high-purity jewelry.",
    defaultLtvPercent: 80,
    appraisalFields: ["Metal Type (Gold/Silver/Pt)", "Purity Grade (Karat/Fineness)", "Gross Weight", "Stone Deduction"],
    exampleItems: ["1 oz Gold Bullion Bar (999.9 Fine)", "22K Bridal Necklace Suite", "100g Silver Mint Bar"],
  },
  LUXURY_WATCHES: {
    id: "LUXURY_WATCHES",
    name: "Horology & Luxury Watches",
    badge: "HOROLOGY",
    description: "High-end Swiss timepieces verified via serial number, movement inspection, and original box/papers.",
    defaultLtvPercent: 65,
    appraisalFields: ["Brand & Manufacture", "Model & Reference Number", "Serial Number", "Box & Original Guarantee Card"],
    exampleItems: ["Rolex Submariner Date 126610LN", "Audemars Piguet Royal Oak 15500ST", "Patek Philippe Nautilus 5711"],
  },
  FINE_ART_COLLECTIBLES: {
    id: "FINE_ART_COLLECTIBLES",
    name: "Fine Art & Collectibles",
    badge: "FINE ART",
    description: "Authenticated paintings, sculptures, rare numismatic coins, and investment-grade collectibles.",
    defaultLtvPercent: 50,
    appraisalFields: ["Artist / Maker", "Title & Creation Year", "Provenance Documentation", "Independent Appraisal Report"],
    exampleItems: ["Modernist Oil Painting (Authenticated)", "Rare 1907 High Relief Saint-Gaudens Double Eagle", "Museum Exhibition Piece"],
  },
  VEHICLES_EQUIPMENT: {
    id: "VEHICLES_EQUIPMENT",
    name: "Vehicles & Heavy Equipment",
    badge: "TITLED ASSETS",
    description: "Exotic and luxury automobiles, yachts, motorcycles, and commercial machinery with verified titles.",
    defaultLtvPercent: 55,
    appraisalFields: ["Make, Model & Year", "VIN / Chassis Number", "Mileage / Hours", "Clear Title & Registration Status"],
    exampleItems: ["Porsche 911 GT3 (992)", "Mercedes-Benz G63 AMG", "Sunseeker Luxury Cabin Cruiser"],
  },
  LUXURY_GOODS: {
    id: "LUXURY_GOODS",
    name: "Luxury Designer Goods & Electronics",
    badge: "LUXURY GOODS",
    description: "Investment-grade leather handbags (Hermès, Chanel), high-end camera systems, and luxury electronics.",
    defaultLtvPercent: 60,
    appraisalFields: ["Brand & Collection", "Date Stamp / Blind Stamp", "Hardware & Leather Condition", "Original Packaging & Dustbag"],
    exampleItems: ["Hermès Birkin 30 Togo Leather", "Chanel Classic Double Flap Caviar", "Leica M11 Professional Camera Kit"],
  },
  GENERAL_COLLATERAL: {
    id: "GENERAL_COLLATERAL",
    name: "General Appraised Collateral",
    badge: "GENERAL ASSET",
    description: "Any physical asset or secured personal property evaluated by an institutional appraiser.",
    defaultLtvPercent: 50,
    appraisalFields: ["Asset Description", "Condition Classification", "Secondary Market Liquidity Score", "Appraiser Sign-off"],
    exampleItems: ["Commercial Broadcast Equipment", "Authenticated Musical Instrument Suite", "Secured Warehouse Inventory"],
  },
};

export function getAssetCategory(id: AssetCategoryId | string): AssetCategoryConfig {
  return UNIVERSAL_ASSET_CATEGORIES[id as AssetCategoryId] || UNIVERSAL_ASSET_CATEGORIES.GENERAL_COLLATERAL;
}
