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

// Promotion bounds travel as instants but are edited in the admin's own clock,
// so the conversion happens at the form edge rather than in the request body.
export function instantToLocalInput(value: string | null): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function localInputToInstant(value: FormDataEntryValue | null): string | null {
    const text = typeof value === 'string' ? value.trim() : '';
    if (!text) return null;
    const date = new Date(text);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function defaultCurrency(plan?: PlanTierResponseDto): string {
    return plan?.priceCurrency ?? 'EUR';
}

const MAX_CODE_LENGTH = 30;

// A catalog code is an identifier, not prose, and no admin should have to invent
// one. It is derived from the name they already typed and de-duped against the
// codes the console has loaded, so the field can be prefilled or dropped entirely.
export function codeFromName(name: string, takenCodes: string[] = []): string {
    const base = name
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, MAX_CODE_LENGTH);

    if (!base) return '';

    const taken = new Set(takenCodes);
    if (!taken.has(base)) return base;

    for (let suffix = 2; suffix < 1000; suffix += 1) {
        const tail = `_${suffix}`;
        const candidate = `${base.slice(0, MAX_CODE_LENGTH - tail.length).replace(/_+$/, '')}${tail}`;
        if (!taken.has(candidate)) return candidate;
    }

    return `${base.slice(0, 20).replace(/_+$/, '')}_${Date.now().toString(36).toUpperCase()}`.slice(0, MAX_CODE_LENGTH);
}
