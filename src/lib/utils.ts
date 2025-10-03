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

export const normalizeQueryParam = (param: string | string[] | undefined): string[] => {
  if (!param) return [];
  const arr = Array.isArray(param) ? param : param.split(',');
  const trimmedAndFiltered = arr.map(s => s.trim()).filter(Boolean);
  return [...new Set(trimmedAndFiltered)];
};
