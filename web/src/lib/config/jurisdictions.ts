/**
 * Universal Worldwide Jurisdiction & Currency Configuration Registry
 *
 * Provides ready-to-use institutional profiles for every major global lending
 * market while allowing operators to configure custom locales and currencies.
 */

export interface JurisdictionProfile {
  code: string;
  name: string;
  region: string;
  currencyCode: string;
  currencySymbol: string;
  locale: string;
  defaultDayCountConvention: "ACTUAL_365" | "ACTUAL_360" | "THIRTY_360";
  kycDocuments: string[];
  description: string;
}

export const WORLDWIDE_JURISDICTIONS: Record<string, JurisdictionProfile> = {
  US: {
    code: "US",
    name: "United States",
    region: "North America",
    currencyCode: "USD",
    currencySymbol: "$",
    locale: "en-US",
    defaultDayCountConvention: "ACTUAL_360",
    kycDocuments: ["Driver's License", "State ID", "US Passport", "SSN / ITIN Card"],
    description: "Conforms to State Pawnbroker Statutes & UCC Article 9 secured lending rules.",
  },
  GB: {
    code: "GB",
    name: "United Kingdom",
    region: "Europe",
    currencyCode: "GBP",
    currencySymbol: "£",
    locale: "en-GB",
    defaultDayCountConvention: "ACTUAL_365",
    kycDocuments: ["UK Passport", "Full Driving Licence", "National Insurance Letter"],
    description: "Compliant with FCA Consumer Credit Act & National Pawnbrokers Association guidelines.",
  },
  EU: {
    code: "EU",
    name: "Eurozone / European Union",
    region: "Europe",
    currencyCode: "EUR",
    currencySymbol: "€",
    locale: "de-DE",
    defaultDayCountConvention: "ACTUAL_360",
    kycDocuments: ["National Identity Card", "EU Passport", "Residence Permit"],
    description: "Tailored for European Pfandhaus, Lombard lending, and asset finance institutions.",
  },
  AE: {
    code: "AE",
    name: "United Arab Emirates / Dubai",
    region: "Middle East",
    currencyCode: "AED",
    currencySymbol: "د.إ",
    locale: "en-AE",
    defaultDayCountConvention: "ACTUAL_360",
    kycDocuments: ["Emirates ID", "Passport with Visa Page", "Trade License (Corporate)"],
    description: "Designed for Gold Souk bullion lenders, luxury horology financiers, and DIFC standards.",
  },
  CH: {
    code: "CH",
    name: "Switzerland",
    region: "Europe",
    currencyCode: "CHF",
    currencySymbol: "CHF",
    locale: "de-CH",
    defaultDayCountConvention: "ACTUAL_360",
    kycDocuments: ["Swiss ID Card", "Passport", "Residence Permit (L/B/C)"],
    description: "Institutional private bank Lombard lending and watch financing standard.",
  },
  SG: {
    code: "SG",
    name: "Singapore",
    region: "Asia-Pacific",
    currencyCode: "SGD",
    currencySymbol: "S$",
    locale: "en-SG",
    defaultDayCountConvention: "ACTUAL_365",
    kycDocuments: ["NRIC", "FIN Card", "Singapore Passport"],
    description: "Compliant with Registry of Pawnbrokers (Ministry of Law Singapore) regulations.",
  },
  AU: {
    code: "AU",
    name: "Australia",
    region: "Oceania",
    currencyCode: "AUD",
    currencySymbol: "A$",
    locale: "en-AU",
    defaultDayCountConvention: "ACTUAL_365",
    kycDocuments: ["Australian Driver Licence", "Australian Passport", "Medicare Card (100 Points ID)"],
    description: "Conforms to National Consumer Credit Protection Act & state second-hand dealer laws.",
  },
  CA: {
    code: "CA",
    name: "Canada",
    region: "North America",
    currencyCode: "CAD",
    currencySymbol: "C$",
    locale: "en-CA",
    defaultDayCountConvention: "ACTUAL_365",
    kycDocuments: ["Provincial Driver's Licence", "Canadian Passport", "Provincial Photo ID"],
    description: "Meets Canadian provincial collateral lending and personal property security regulations.",
  },
  IN: {
    code: "IN",
    name: "India",
    region: "South Asia",
    currencyCode: "INR",
    currencySymbol: "₹",
    locale: "en-IN",
    defaultDayCountConvention: "ACTUAL_365",
    kycDocuments: ["Aadhaar Card", "PAN Card", "Voter ID", "Passport"],
    description: "Supports RBI Gold Loan LTV slabs (85%/80%/75%) and PAN threshold checks.",
  },
  SA: {
    code: "SA",
    name: "Saudi Arabia",
    region: "Middle East",
    currencyCode: "SAR",
    currencySymbol: "﷼",
    locale: "en-SA",
    defaultDayCountConvention: "ACTUAL_360",
    kycDocuments: ["National ID (Iqama/Muqeem)", "Passport", "Commercial Registration"],
    description: "SAMA-aligned asset-backed finance and physical gold collateral standard.",
  },
  JP: {
    code: "JP",
    name: "Japan",
    region: "Asia-Pacific",
    currencyCode: "JPY",
    currencySymbol: "¥",
    locale: "ja-JP",
    defaultDayCountConvention: "ACTUAL_365",
    kycDocuments: ["My Number Card", "Driver's License", "Passport"],
    description: "Compliant with Japanese Shichi-ya (Pawnbroker Business Act) regulations.",
  },
  GLOBAL: {
    code: "GLOBAL",
    name: "Global Custom / Multi-Currency",
    region: "Worldwide",
    currencyCode: "USD",
    currencySymbol: "$",
    locale: "en-US",
    defaultDayCountConvention: "ACTUAL_365",
    kycDocuments: ["National Passport", "Government Photo ID Card", "Driving License"],
    description: "Universal profile adaptable to any national currency, asset class, or regulatory regime.",
  },
};

/**
 * Retrieve jurisdiction configuration by country code.
 */
export function getJurisdictionProfile(code: string | null | undefined): JurisdictionProfile {
  if (!code) return WORLDWIDE_JURISDICTIONS.GLOBAL;
  const upper = code.toUpperCase();
  return WORLDWIDE_JURISDICTIONS[upper] || WORLDWIDE_JURISDICTIONS.GLOBAL;
}

/**
 * Format a numeric or decimal amount according to a country's currency and locale.
 */
export function formatUniversalCurrency(
  amount: number | string,
  currencyCode = "USD",
  locale = "en-US"
): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return `${currencyCode} 0.00`;

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: currencyCode === "JPY" ? 0 : 2,
      maximumFractionDigits: currencyCode === "JPY" ? 0 : 2,
    }).format(num);
  } catch {
    return `${currencyCode} ${num.toFixed(2)}`;
  }
}
