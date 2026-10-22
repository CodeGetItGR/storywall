'use client';

import { Pencil } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { type MouseEvent } from 'react';

import { SiteNoticeAreaPills, SiteNoticeStatusPill, SiteNoticeTonePill } from '@/components/admin/siteNotices/SiteNoticePills';
import { useLocalizedText } from '@/hooks/useLocalizedText';
import type { AdminSiteNoticeDto } from '@/lib/api/types';
import { formatDate } from '@/lib/datetime';

const DATE_FORMAT: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' };

export function SiteNoticesTable({
    notices,
    onEditAction,
}: {
    notices: AdminSiteNoticeDto[];
    onEditAction: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
    const t = useTranslations('AdminPage.siteNotices');
    const locale = useLocale();
    const localizedText = useLocalizedText();

    return (
        <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
                {/* Columns */}
                <thead>
                    <tr className="border-b border-border text-[11px] font-bold tracking-wide text-ink-faint uppercase">
                        <th className="px-4 py-3 font-bold">{t('columns.tone')}</th>
                        <th className="px-3 py-3 font-bold">{t('columns.message')}</th>
                        <th className="hidden px-3 py-3 font-bold md:table-cell">{t('columns.areas')}</th>
                        <th className="px-3 py-3 font-bold">{t('columns.status')}</th>
                        <th className="hidden px-3 py-3 font-bold lg:table-cell">{t('columns.schedule')}</th>
                        <th className="w-10 px-2 py-3" />
                    </tr>
                </thead>

                {/* Rows */}
                <tbody>
                    {notices.map((notice) => {
                        const message = localizedText(notice.message);
                        const start = notice.startsAt ? formatDate(locale, notice.startsAt, DATE_FORMAT) : t('scheduleNow');
                        const end = notice.endsAt ? formatDate(locale, notice.endsAt, DATE_FORMAT) : t('scheduleNoEnd');
                        return (
                            <tr key={notice.id} className="border-b border-border last:border-b-0 hover:bg-canvas/55">
                                <td className="px-4 py-3">
                                    <SiteNoticeTonePill tone={notice.tone} />
                                </td>
                                <td className="w-full max-w-0 px-3 py-3">
                                    <span className="block truncate text-ink">{message}</span>
                                </td>
                                <td className="hidden px-3 py-3 md:table-cell">
                                    <SiteNoticeAreaPills areas={notice.areas} />
                                </td>
                                <td className="px-3 py-3">
                                    <SiteNoticeStatusPill status={notice.status} />
                                </td>
                                <td className="hidden px-3 py-3 font-mono text-xs whitespace-nowrap text-ink-muted lg:table-cell">
                                    {start} → {end}
                                </td>
                                <td className="px-2 py-3">
                                    <button
                                        type="button"
                                        data-notice-id={notice.id}
                                        onClick={onEditAction}
                                        aria-label={`${t('edit')} ${message}`}
                                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-canvas hover:text-ink"
                                    >
                                        <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
