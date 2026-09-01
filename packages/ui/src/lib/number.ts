export interface FormatNumberOptions {
  /**
   * Whether to shorten large numbers into K, M, B, T.
   * @default true
   */
  compact?: boolean;

  /**
   * Maximum decimal places when compacted (e.g. 1.25M vs 1.3M).
   * Automatically strips trailing zeros (e.g., "1.0M" -> "1M").
   * @default 1
   */
  decimals?: number;

  /**
   * Optional prefix (e.g., "₦", "+").
   */
  prefix?: string;

  /**
   * Optional suffix (e.g., " votes", " PUs").
   */
  suffix?: string;

  /**
   * Fallback string for null, undefined, or NaN values.
   * @default "0"
   */
  fallback?: string;
}

/**
 * Formats a number with optional compact notation (K, M, B, T), locale commas, and prefixes/suffixes.
 *
 * EXAMPLE USAGE:
 * - formatNumber(850)                               // "850"
 * - formatNumber(1450)                              // "1.5K"
 * - formatNumber(1450, { compact: false })          // "1,450"
 * - formatNumber(2500000)                           // "2.5M"
 * - formatNumber(2500000, { suffix: " votes" })     // "2.5M votes"
 * - formatNumber(1000000000)                        // "1B"
 *
 * @param value The number to format
 * @param options Formatting configuration options
 */
export function formatNumber(
  value: number | string | null | undefined,
  options?: FormatNumberOptions,
): string {
  const {
    compact = true,
    decimals = 1,
    prefix = "",
    suffix = "",
    fallback = "0",
  } = options || {};

  if (value === null || value === undefined || value === "") {
    return `${prefix}${fallback}${suffix}`;
  }

  const num = typeof value === "string" ? Number(value) : value;

  if (Number.isNaN(num)) {
    return `${prefix}${fallback}${suffix}`;
  }

  if (!compact || Math.abs(num) < 1000) {
    return `${prefix}${num.toLocaleString("en-US")}${suffix}`;
  }

  const absNum = Math.abs(num);
  const sign = num < 0 ? "-" : "";

  interface Tier {
    divisor: number;
    symbol: string;
  }

  const tiers: Tier[] = [
    { divisor: 1e12, symbol: "t" },
    { divisor: 1e9, symbol: "b" },
    { divisor: 1e6, symbol: "m" },
    { divisor: 1e3, symbol: "k" },
  ];

  for (const tier of tiers) {
    if (absNum >= tier.divisor) {
      const formatted = (absNum / tier.divisor).toFixed(decimals);
      // Remove trailing zeroes like "1.0" -> "1"
      const cleanNum = Number(formatted).toString();
      return `${prefix}${sign}${cleanNum}${tier.symbol}${suffix}`;
    }
  }

  return `${prefix}${num.toLocaleString("en-US")}${suffix}`;
}

export interface FormatVotesOptions {
  /**
   * Whether to shorten large vote counts into K, M, B (e.g. 1.2M votes).
   * @default true
   */
  compact?: boolean;

  /**
   * Maximum decimal places when compacted.
   * @default 1
   */
  decimals?: number;
}

/**
 * Convenience helper to format election vote counts.
 *
 * EXAMPLE USAGE:
 * - formatVotes(850)                               // "850 votes"
 * - formatVotes(1450)                              // "1.5K votes"
 * - formatVotes(1450, { compact: false })          // "1,450 votes"
 * - formatVotes(2500000)                           // "2.5M votes"
 *
 * @param votes The number of votes
 * @param options Formatting options
 */
export function formatVotes(
  votes: number | string | null | undefined,
  options?: FormatVotesOptions,
): string {
  const count = typeof votes === "string" ? Number(votes) : (votes ?? 0);
  const isSingular = Math.abs(count) === 1;
  const suffix = isSingular ? " vote" : " votes";

  return formatNumber(votes, {
    compact: options?.compact ?? true,
    decimals: options?.decimals ?? 1,
    suffix,
  });
}

export interface FormatKoboOptions {
  /**
   * Whether to shorten into K, M, B (e.g. ₦1.5M).
   * @default false
   */
  compact?: boolean;

  /**
   * Maximum decimal places when compacted.
   * @default 1
   */
  decimals?: number;
}

/**
 * Formats a monetary amount given in Kobo to Naira string with the ₦ sign.
 *
 * EXAMPLE USAGE:
 * - formatKoboToNaira(25000000)                    // "₦250,000"
 * - formatKoboToNaira(25000000, { compact: true }) // "₦250K"
 *
 * @param kobo The amount in kobo (100 kobo = 1 Naira)
 * @param options Formatting options
 */
export function formatKoboToNaira(
  kobo: number | string | null | undefined,
  options?: FormatKoboOptions,
): string {
  if (kobo === null || kobo === undefined || kobo === "") {
    return "₦0";
  }

  const koboNum = typeof kobo === "string" ? Number(kobo) : kobo;
  if (Number.isNaN(koboNum)) {
    return "₦0";
  }

  const naira = koboNum / 100;

  return formatNumber(naira, {
    compact: options?.compact ?? false,
    decimals: options?.decimals ?? 1,
    prefix: "₦",
  });
}

/**
 * Formats a percentage value (0-100).
 *
 * EXAMPLE USAGE:
 * - formatPercentage(45.678)                       // "45.7%"
 * - formatPercentage(45.678, { decimals: 2 })      // "45.68%"
 *
 * @param value The percentage number
 * @param options Options for decimal precision
 */
export function formatPercentage(
  value: number | string | null | undefined,
  options?: { decimals?: number },
): string {
  if (value === null || value === undefined || value === "") {
    return "0%";
  }

  const num = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(num)) {
    return "0%";
  }

  const decimals = options?.decimals ?? 1;
  const clean = Number(num.toFixed(decimals)).toString();
  return `${clean}%`;
}
