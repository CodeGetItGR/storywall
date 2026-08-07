import { ERROR_CODES, getErrorCode } from '@/lib/api/errors';

export type AdminErrorMessageKey = 'planInUse' | 'onlyDefault' | 'generic';

export function emptyToNull(value: FormDataEntryValue | null): string | null {
    const text = typeof value === 'string' ? value.trim() : '';
    return text ? text : null;
}

export function numberOrNull(value: FormDataEntryValue | null): number | null {
    const text = typeof value === 'string' ? value.trim() : '';
    return text ? Number(text) : null;
}

export function checked(formData: FormData, key: string): boolean {
    return formData.get(key) === 'on';
}

export function adminErrorMessageKey(error: unknown): AdminErrorMessageKey {
    const code = getErrorCode(error);
    if (code === ERROR_CODES.PLAN_TIER_IN_USE) return 'planInUse';
    if (code === ERROR_CODES.PLAN_TIER_IS_ONLY_DEFAULT) return 'onlyDefault';
    return 'generic';
}
