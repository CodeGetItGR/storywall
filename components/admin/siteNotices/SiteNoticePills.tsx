'use client';

import { useTranslations } from 'next-intl';

import type { SiteNoticeArea, SiteNoticeStatus, SiteNoticeTone } from '@/lib/api/types';
import { cn } from '@/lib/utils';

const PILL = 'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap';

const STATUS_CLASS: Record<SiteNoticeStatus, string> = {
    LIVE: 'bg-status-good-wash text-status-good',
    SCHEDULED: 'bg-status-warn-wash text-status-warn',
    ENDED: 'bg-status-neutral-wash text-status-neutral',
    OFF: 'bg-status-neutral-wash text-status-neutral',
};

const TONE_CLASS: Record<SiteNoticeTone, string> = {
    CRITICAL: 'bg-status-danger-wash text-status-danger',
    WARNING: 'bg-status-warn-wash text-status-warn',
    OFFER: 'bg-status-neutral-wash text-ink',
    INFO: 'bg-status-neutral-wash text-status-neutral',
};

export function SiteNoticeStatusPill({ status }: { status: SiteNoticeStatus }) {
    const t = useTranslations('AdminPage.siteNotices');
    return <span className={cn(PILL, STATUS_CLASS[status])}>{t(`status.${status}`)}</span>;
}

export function SiteNoticeTonePill({ tone }: { tone: SiteNoticeTone }) {
    const t = useTranslations('AdminPage.siteNotices');
    return <span className={cn(PILL, TONE_CLASS[tone])}>{t(`tone.${tone}`)}</span>;
}

export function SiteNoticeAreaPills({ areas }: { areas: SiteNoticeArea[] }) {
    const t = useTranslations('AdminPage.siteNotices');
    return (
        <span className="flex flex-wrap gap-1">
            {areas.map((area) => (
                <span key={area} className="rounded-md border border-border px-2 py-0.5 text-xs whitespace-nowrap text-ink-muted">
                    {t(`area.${area}`)}
                </span>
            ))}
        </span>
    );
}
