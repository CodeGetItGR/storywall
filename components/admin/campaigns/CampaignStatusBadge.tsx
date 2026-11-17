'use client';

import { useTranslations } from 'next-intl';

import type { CampaignStatus } from '@/lib/api/types';
import { cn } from '@/lib/utils';

const PILL = 'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap';

const STATUS_CLASS: Record<CampaignStatus, string> = {
    LIVE: 'bg-status-good-wash text-status-good',
    SCHEDULED: 'bg-status-warn-wash text-status-warn',
    ENDED: 'bg-status-neutral-wash text-status-neutral',
    ARCHIVED: 'bg-status-neutral-wash text-status-neutral',
};

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
    const t = useTranslations('AdminPage.campaigns.status');
    return <span className={cn(PILL, STATUS_CLASS[status])}>{t(status)}</span>;
}
