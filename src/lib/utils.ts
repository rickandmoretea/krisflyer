import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

export function r0(n: number) {
  return Math.round(n);
}

export function r2(n: number) {
  return Math.round(n * 100) / 100;
}

export function fmtTHB(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "THB", maximumFractionDigits: 0 });
}

export function fmt(n: number) {
  return n.toLocaleString();
}
