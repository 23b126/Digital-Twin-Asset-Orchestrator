import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const ASSET_TYPES = [
  'Building',
  'Floor',
  'Room',
  'HVAC System',
  'Elevator',
  'Generator',
  'Security System'
];

export const STATUS_COLORS: Record<string, string> = {
  'Available': 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
  'Assigned': 'text-blue-500 bg-blue-500/10 border-blue-500/20',
  'Under Maintenance': 'text-amber-500 bg-amber-500/10 border-amber-500/20',
  'Retired': 'text-rose-500 bg-rose-500/10 border-rose-500/20'
};
