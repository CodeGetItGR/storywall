'use client';

import { useTranslations } from 'next-intl';

import type { PartnerApplicationStatus } from '@/lib/api/types';
import { cn } from '@/lib/utils';

const TONE: Record<PartnerApplicationStatus, string> = {
    PENDING: 'bg-status-warn-wash text-status-warn',
    APPROVED: 'bg-status-good-wash text-status-good',
    DECLINED: 'bg-status-neutral-wash text-status-neutral',
};

export function PartnerApplicationStatusPill({ status }: { status: PartnerApplicationStatus }) {
    const t = useTranslations('AdminPage.partnerApplications.status');
    return <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold', TONE[status])}>{t(status)}</span>;
}
