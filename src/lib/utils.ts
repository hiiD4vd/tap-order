import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function generateToken(length = 6): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // 32 chars
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes); // Web Crypto CSPRNG: browser + modern Node.
  let result = '';
  for (const byte of bytes) result += chars.charAt(byte & 31);
  return result;
}
