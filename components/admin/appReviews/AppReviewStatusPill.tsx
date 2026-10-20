'use client';

import { useTranslations } from 'next-intl';

import type { AppReviewStatus } from '@/lib/api/types';
import { cn } from '@/lib/utils';

const TONE: Record<AppReviewStatus, string> = {
    PENDING: 'bg-status-warn-wash text-status-warn',
    APPROVED: 'bg-status-good-wash text-status-good',
    HIDDEN: 'bg-status-neutral-wash text-status-neutral',
};

export function AppReviewStatusPill({ status }: { status: AppReviewStatus }) {
    const t = useTranslations('AdminPage.appReviews.status');

    return <span className={cn('inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold', TONE[status])}>{t(status)}</span>;
}
