'use client';

import { useTranslations } from 'next-intl';

import type { CampaignDayDto } from '@/lib/api/types';
import { sparklinePoints, type Trend } from '@/lib/campaignCompare';
import { cn } from '@/lib/utils';

const WIDTH = 80;
const HEIGHT = 24;

const TREND_CLASS: Record<Trend, string> = {
    up: 'text-status-good',
    down: 'text-status-danger',
    flat: 'text-ink-faint',
};

// Visitors per day in the range. Green rising, red falling, gray steady or when `muted` (the Past tab).
export function CampaignTrend({ daily, trend, muted = false }: { daily: CampaignDayDto[]; trend: Trend; muted?: boolean }) {
    const t = useTranslations('AdminPage.campaigns.trend');
    const label = t(trend);

    return (
        <svg
            role="img"
            aria-label={label}
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className={cn('h-6 w-20 overflow-visible', muted ? 'text-ink-faint' : TREND_CLASS[trend])}
        >
            <polyline
                points={sparklinePoints(
                    daily.map((day) => day.visitors),
                    WIDTH,
                    HEIGHT,
                )}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}
