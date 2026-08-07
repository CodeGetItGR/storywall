import type { PlanTierResponseDto } from '@/lib/api/types';

export const STORAGE_UNITS = ['MB', 'GB', 'TB'] as const;

export type StorageUnit = (typeof STORAGE_UNITS)[number];

const STORAGE_FACTORS: Record<StorageUnit, number> = {
    MB: 1024 ** 2,
    GB: 1024 ** 3,
    TB: 1024 ** 4,
};

export function priceMinorToInput(value: number | null): string {
    return value === null ? '' : (value / 100).toFixed(2).replace(/\.00$/, '');
}

export function priceInputToMinor(value: FormDataEntryValue | null): number | null {
    const text = typeof value === 'string' ? value.trim() : '';
    if (!text) return null;
    return Math.round(Number(text) * 100);
}

export function storageBytesToInput(bytes: number | null): { amount: string; unit: StorageUnit } {
    if (bytes === null) return { amount: '', unit: 'GB' };

    const unit = [...STORAGE_UNITS].reverse().find((candidate) => bytes >= STORAGE_FACTORS[candidate]) ?? 'MB';
    const amount = bytes / STORAGE_FACTORS[unit];

    return {
        amount: Number.isInteger(amount) ? String(amount) : amount.toFixed(2).replace(/\.?0+$/, ''),
        unit,
    };
}

export function storageInputToBytes(amountValue: FormDataEntryValue | null, unitValue: FormDataEntryValue | null): number | null {
    const amountText = typeof amountValue === 'string' ? amountValue.trim() : '';
    const unit = typeof unitValue === 'string' && STORAGE_UNITS.includes(unitValue as StorageUnit) ? (unitValue as StorageUnit) : 'GB';

    if (!amountText) return null;
    return Math.round(Number(amountText) * STORAGE_FACTORS[unit]);
}

export function defaultCurrency(plan?: PlanTierResponseDto): string {
    return plan?.priceCurrency ?? 'EUR';
}
