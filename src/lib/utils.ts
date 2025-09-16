import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const normalizeQueryParam = (param: string | string[] | undefined): string[] => {
  if (!param) return [];
  const arr = Array.isArray(param) ? param : param.split(',');
  return arr.map(s => s.trim()).filter(Boolean);
};
