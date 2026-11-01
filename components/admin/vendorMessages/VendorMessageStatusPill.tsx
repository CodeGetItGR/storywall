'use client';

import { useTranslations } from 'next-intl';

import type { VendorContactStatus } from '@/lib/api/types';
import { cn } from '@/lib/utils';

const TONE: Record<VendorContactStatus, string> = {
    NEW: 'bg-status-warn-wash text-status-warn',
    ANSWERED: 'bg-status-good-wash text-status-good',
};

export function VendorMessageStatusPill({ status }: { status: VendorContactStatus }) {
    const t = useTranslations('AdminPage.vendorMessagesPanel.statuses');
    return <span className={cn('inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold', TONE[status])}>{t(status)}</span>;
}
