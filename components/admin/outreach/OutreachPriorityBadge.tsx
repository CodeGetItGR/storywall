'use client';

import { useTranslations } from 'next-intl';

import type { OutreachPriority } from '@/lib/api/types';
import { cn } from '@/lib/utils';

const TONE: Record<OutreachPriority, string> = {
    A: 'bg-ink text-white',
    B: 'bg-surface-muted text-ink-muted',
    C: 'bg-canvas text-ink-faint',
};

export function OutreachPriorityBadge({ priority }: { priority: OutreachPriority }) {
    const t = useTranslations('AdminPage.outreach.priority');
    return (
        <span
            title={t(priority)}
            className={cn('inline-flex h-6 w-6 items-center justify-center rounded-md font-mono text-[11px] font-bold', TONE[priority])}
        >
            <span aria-hidden="true">{priority}</span>
            <span className="sr-only">{t(priority)}</span>
        </span>
    );
}
