'use client';

import { useTranslations } from 'next-intl';

import { OUTREACH_STATUS_TONE } from '@/lib/adminOutreach';
import type { OutreachStatus } from '@/lib/api/types';
import { cn } from '@/lib/utils';

export function OutreachStatusPill({ status }: { status: OutreachStatus }) {
    const t = useTranslations('AdminPage.outreach.status');
    return (
        <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold whitespace-nowrap', OUTREACH_STATUS_TONE[status].pill)}>{t(status)}</span>
    );
}
