import type { PlanTierResponseDto } from '@/lib/api/types';

export interface MediaEstimateConfig {
    estimateAvgImageBytes: number;
    estimateAvgVideoBytes: number;
    estimateImageRatio: number;
}

export const PLAN_COMPARISON_EMPTY = '-';

export function mediaEstimate(storageBytes: number | null, config: MediaEstimateConfig): { images: string; videos: string } | null {
    if (storageBytes === null) return null;

    const images = Math.max(1, Math.floor((storageBytes * config.estimateImageRatio) / config.estimateAvgImageBytes));
    const videos = Math.max(1, Math.floor((storageBytes * (1 - config.estimateImageRatio)) / config.estimateAvgVideoBytes));

    return { images: images.toLocaleString(), videos: videos.toLocaleString() };
}

export function formatPlanText(value: string | null): string {
    return value?.trim() ? value : PLAN_COMPARISON_EMPTY;
}

export function formatPlanDiscount(plan: PlanTierResponseDto): string {
    if (plan.discountPercent === null && !plan.discountLabel) return PLAN_COMPARISON_EMPTY;
    return [plan.discountPercent === null ? null : `${plan.discountPercent}%`, plan.discountLabel].filter(Boolean).join(' · ');
}
