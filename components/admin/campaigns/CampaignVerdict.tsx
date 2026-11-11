'use client';

import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { EMPTY_VALUE } from '@/lib/adminFunnel';
import type { Verdict, VerdictMeasure } from '@/lib/campaignCompare';
import { cn } from '@/lib/utils';

const MEASURE_KEY: Record<VerdictMeasure, 'Sales' | 'SignedUp'> = { sales: 'Sales', signedUp: 'SignedUp' };

function verdictKey(verdict: Verdict): string {
    if (verdict.kind === 'early' || verdict.kind === 'noSignUps' || verdict.kind === 'average') return verdict.kind;
    if (verdict.kind === 'worse') return `fewer${MEASURE_KEY[verdict.measure]}`;
    return verdict.multiple === null ? `more${MEASURE_KEY[verdict.measure]}` : `better${MEASURE_KEY[verdict.measure]}`;
}

function tone(verdict: Verdict): 'good' | 'bad' | 'neutral' {
    if (verdict.kind === 'better') return 'good';
    if (verdict.kind === 'worse' || verdict.kind === 'noSignUps') return 'bad';
    return 'neutral';
}

const TONE_CLASS = {
    good: 'bg-status-good-wash text-status-good',
    bad: 'bg-status-danger-wash text-status-danger',
    neutral: 'bg-status-neutral-wash text-status-neutral',
} as const;

const TONE_ICON = { good: TrendingUp, bad: TrendingDown, neutral: Minus } as const;

// One short verdict: green better, red worse or no sign-ups, gray otherwise. A dash with nothing to
// compare with.
export function CampaignVerdict({ verdict }: { verdict: Verdict | null }) {
    const t = useTranslations('AdminPage.campaigns.verdict');
    if (!verdict) return <span className="text-sm text-ink-faint">{EMPTY_VALUE}</span>;

    const verdictTone = tone(verdict);
    const Icon = TONE_ICON[verdictTone];
    const multiple = verdict.kind === 'better' && verdict.multiple !== null ? verdict.multiple : 0;

    return (
        <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap', TONE_CLASS[verdictTone])}>
            <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
            <span>{t(verdictKey(verdict), { multiple })}</span>
        </span>
    );
}
