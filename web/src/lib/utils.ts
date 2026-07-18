import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  val: string | number | undefined | null,
  symbol: string = "$",
  code: string = "USD"
) {
  if (val === undefined || val === null) return `${symbol}0`;
  const num =
    typeof val === "string" ? parseFloat(val) : typeof val === "object" ? Number(val) : val;
  if (isNaN(num)) return `${symbol}0`;

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
      maximumFractionDigits: 0,
    }).format(num);
  } catch {
    return `${symbol}${num.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  }
}

export function formatCurrencyExact(
  val: string | number | undefined | null,
  symbol: string = "$",
  code: string = "USD"
) {
  if (val === undefined || val === null) return `${symbol}0.00`;
  const num =
    typeof val === "string" ? parseFloat(val) : typeof val === "object" ? Number(val) : val;
  if (isNaN(num)) return `${symbol}0.00`;

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  } catch {
    return `${symbol}${num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
}

export function formatINR(val: string | number | undefined | null) {
  return formatCurrency(val, "₹", "INR");
}

export function formatINRExact(val: string | number | undefined | null) {
  return formatCurrencyExact(val, "₹", "INR");
}

export function formatDate(dateString: Date | string | undefined | null) {
  if (!dateString) return "N/A";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(dateString));
}

export function formatDateTime(dateString: Date | string | undefined | null) {
  if (!dateString) return "N/A";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString));
}
