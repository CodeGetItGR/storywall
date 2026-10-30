'use client';

import { useTranslations } from 'next-intl';

import { OUTREACH_STATUS_TONE, OUTREACH_STATUSES } from '@/lib/adminOutreach';
import { cn } from '@/lib/utils';

export function OutreachStatusLegend() {
    const t = useTranslations('AdminPage.outreach.status');

    return (
        <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
            {OUTREACH_STATUSES.map((status) => (
                <li key={status} className="flex items-center gap-1.5 text-xs text-ink-muted">
                    <span aria-hidden="true" className={cn('h-2.5 w-2.5 rounded-full', OUTREACH_STATUS_TONE[status].bar)} />
                    {t(status)}
                </li>
            ))}
        </ul>
    );
}
