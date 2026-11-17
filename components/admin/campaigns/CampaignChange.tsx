'use client';

import { ArrowDown, ArrowUp, Equal } from 'lucide-react';

import { AdminIconTip } from '@/components/admin/AdminIconTip';
import { useCampaignFormat } from '@/hooks/useCampaignFormat';
import type { Change } from '@/lib/campaignCompare';
import { cn } from '@/lib/utils';

// A number's change against the previous period: an arrow and the amount, green up, red down, a muted
// equal sign for no change. The words are its name, and show on hover, focus or tap.
export function CampaignChange({ change, compared, currency }: { change: Change | null; compared: string | null; currency?: string }) {
    const format = useCampaignFormat();
    if (!change) return null;

    const words = format.changeWords(change, compared, currency);
    const tone = change.kind === 'same' ? 'text-ink-faint' : change.direction === 'up' ? 'text-status-good' : 'text-status-danger';
    const Icon = change.kind === 'same' ? Equal : change.direction === 'up' ? ArrowUp : ArrowDown;

    return (
        <AdminIconTip label={words} className={cn('gap-0.5 font-mono text-xs font-semibold tabular-nums', tone)}>
            <Icon aria-hidden="true" className="h-3 w-3 shrink-0" />
            {change.kind !== 'same' && <span aria-hidden="true">{format.changeValue(change, currency)}</span>}
        </AdminIconTip>
    );
}
