import type { PlanTierResponseDto } from '@/lib/api/types';

const APPROX_IMAGE_BYTES = 4 * 1024 * 1024;
const APPROX_VIDEO_BYTES = 90 * 1024 * 1024;

export const PLAN_COMPARISON_EMPTY = '-';

export function mediaEstimate(storageBytes: number | null): { images: string; videos: string } | null {
    if (storageBytes === null) return null;
    return {
        images: Math.max(1, Math.floor(storageBytes / APPROX_IMAGE_BYTES)).toLocaleString(),
        videos: Math.max(1, Math.floor(storageBytes / APPROX_VIDEO_BYTES)).toLocaleString(),
    };
}

export function formatPlanText(value: string | null): string {
    return value?.trim() ? value : PLAN_COMPARISON_EMPTY;
}

export function formatPlanDiscount(plan: PlanTierResponseDto): string {
    if (plan.discountPercent === null && !plan.discountLabel) return PLAN_COMPARISON_EMPTY;
    return [plan.discountPercent === null ? null : `${plan.discountPercent}%`, plan.discountLabel].filter(Boolean).join(' · ');
}
