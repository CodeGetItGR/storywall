'use client';

import { useTranslations } from 'next-intl';

import type { OutreachRequestStatus } from '@/lib/api/types';
import { cn } from '@/lib/utils';

const TONE: Record<OutreachRequestStatus, string> = {
    PENDING: 'bg-status-warn-wash text-status-warn',
    APPROVED: 'bg-status-good-wash text-status-good',
    DECLINED: 'bg-status-neutral-wash text-status-neutral',
};

export function OutreachRequestStatusPill({ status }: { status: OutreachRequestStatus }) {
    const t = useTranslations('AdminPage.outreach.requests.status');
    return <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold', TONE[status])}>{t(status)}</span>;
}
