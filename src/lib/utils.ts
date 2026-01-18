import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge and normalize class name inputs for Tailwind usage.
 *
 * Accepts any values supported by `clsx` (strings, arrays, objects, falsy values),
 * resolves conditional/class lists, then uses `twMerge` to deduplicate and
 * resolve conflicting Tailwind utility classes.
 *
 * @param inputs - Class name values (strings, arrays, objects, etc.) accepted by `clsx`
 * @returns A single space-separated string of merged class names suitable for Tailwind
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeQueryParam(param: string | string[] | null | undefined): string[] | undefined {
  if (!param) return undefined;
  const arr = Array.isArray(param)
    ? param.flatMap(s => s.split(','))
    : param.split(',');
  const trimmedAndFiltered = arr.map(s => s.trim()).filter(Boolean);
  const unique = [...new Set(trimmedAndFiltered)];
  return unique.length > 0 ? unique : undefined;
}

export function normalizeTagsToString(tags: string | string[] | undefined): string {
  const normalized = normalizeQueryParam(tags);
  return normalized ? normalized.join(', ') : "";
}
