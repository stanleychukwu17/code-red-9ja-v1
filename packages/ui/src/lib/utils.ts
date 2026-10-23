import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Safely resolves PostgreSQL pgtype objects (e.g. Text, Int8, Int4, Float64)
 * or primitive string/number values into a normalized string.
 */
export function getVal(val: unknown): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "bigint") return String(val);
  if (typeof val === "object") {
    if ("String" in val && typeof (val as { String: unknown }).String === "string") {
      return (val as { String: string }).String;
    }
    if ("Int64" in val) return String((val as { Int64: unknown }).Int64);
    if ("Int32" in val) return String((val as { Int32: unknown }).Int32);
    if ("Float64" in val) return String((val as { Float64: unknown }).Float64);
  }
  return String(val);
}

/**
 * Safely resolves PostgreSQL numeric pgtype objects (e.g. Int8, Int4, Int2)
 * or primitive numbers into a number or undefined.
 */
export function getId(val: unknown): number | undefined {
  if (val === null || val === undefined) return undefined;
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const parsed = Number(val);
    return isNaN(parsed) ? undefined : parsed;
  }
  if (typeof val === "object") {
    const obj = val as Record<string, unknown>;
    if ("Int64" in obj && (obj.Valid === undefined || obj.Valid)) return Number(obj.Int64);
    if ("Int32" in obj && (obj.Valid === undefined || obj.Valid)) return Number(obj.Int32);
    if ("Int16" in obj && (obj.Valid === undefined || obj.Valid)) return Number(obj.Int16);
  }
  return undefined;
}
