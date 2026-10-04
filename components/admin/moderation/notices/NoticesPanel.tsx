'use client';

import { useLocale, useTranslations } from 'next-intl';
import { type MouseEvent, useState } from 'react';

import { AdminPagination } from '@/components/admin/betaFeedback/AdminPagination';
import { NoticeDrawer } from '@/components/admin/moderation/notices/NoticeDrawer';
import { LoadingState } from '@/components/ui/LoadingState';
import { useAdminNotices } from '@/hooks/useAdminNotices';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import type { ContentNoticeSummaryDto, NoticeListView } from '@/lib/api/types';
import { formatDate } from '@/lib/datetime';

const VIEWS: readonly NoticeListView[] = ['NEW', 'CLOSED'];
const DATE_FORMAT: Intl.DateTimeFormatOptions = { dateStyle: 'medium' };

// The Notices tab (content-notices-fe-integration.md §2.1). Rows carry no notifier name or email.
export function NoticesPanel() {
    const t = useTranslations('AdminPage.moderation.notices');
    const tCategory = useTranslations('ContentNoticeForm.categories');
    const tOutcome = useTranslations('AdminPage.moderation.outcome');
    const locale = useLocale();
    const toErrorMessage = useApiErrorMessage();
    const [view, setView] = useState<NoticeListView>('NEW');
    const [page, setPage] = useState(0);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const query = useAdminNotices(view, page);
    const data = query.data;

    function selectView(event: MouseEvent<HTMLButtonElement>) {
        setView(event.currentTarget.dataset.view as NoticeListView);
        setPage(0);
    }
    function openNotice(event: MouseEvent<HTMLButtonElement>) {
        setSelectedId(event.currentTarget.dataset.id ?? null);
    }
    function closeNotice() {
        setSelectedId(null);
    }

    function statusLabel(notice: ContentNoticeSummaryDto): string {
        if (notice.outcome) return tOutcome(notice.outcome);
        if (notice.closeReason) return t(`closeReasons.${notice.closeReason}`);
        // Untouched notices have no decision to wait for: pending is only an attached case without an outcome.
        return notice.status === 'NEW' ? t('statusNew') : t('pending');
    }

    return (
        <div className="space-y-6">
            <div role="group" aria-label={t('viewsLabel')} className="flex gap-2">
                {VIEWS.map((item) => (
                    <button
                        key={item}
                        type="button"
                        data-view={item}
                        aria-pressed={view === item}
                        onClick={selectView}
                        className={
                            view === item
                                ? 'rounded-md bg-ink px-3 py-1.5 text-sm font-semibold text-canvas'
                                : 'rounded-md px-3 py-1.5 text-sm font-semibold text-ink-muted hover:bg-card'
                        }
                    >
                        {t(`views.${item}`)}
                    </button>
                ))}
            </div>

            <section className="overflow-hidden rounded-xl border border-border bg-card">
                {query.isLoading ? <LoadingState label={t('loading')} className="min-h-48" /> : null}
                {query.error ? <p className="px-5 py-12 text-center text-sm text-status-danger">{toErrorMessage(query.error)}</p> : null}
                {data && data.content.length === 0 ? <p className="px-5 py-14 text-center text-sm text-ink-muted">{t('empty')}</p> : null}
                {data && data.content.length > 0 ? (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[820px] border-collapse text-sm">
                                <thead>
                                    <tr className="border-b border-border text-left text-[11px] font-bold tracking-wide text-ink-faint uppercase">
                                        <th className="px-5 py-3 font-bold">{t('columns.received')}</th>
                                        <th className="px-3 py-3 font-bold">{t('columns.category')}</th>
                                        <th className="px-3 py-3 font-bold">{t('columns.location')}</th>
                                        <th className="px-3 py-3 font-bold">{t('columns.reference')}</th>
                                        <th className="px-5 py-3 font-bold">{t('columns.status')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.content.map((notice) => (
                                        <tr key={notice.id} className="border-b border-border last:border-b-0 hover:bg-canvas/55">
                                            <td className="px-5 py-3.5 font-mono text-xs whitespace-nowrap text-ink-muted">
                                                {formatDate(locale, notice.createdAt, DATE_FORMAT)}
                                            </td>
                                            <td className="px-3 py-3.5">
                                                <button
                                                    type="button"
                                                    data-id={notice.id}
                                                    onClick={openNotice}
                                                    aria-label={t('openNotice', { reference: notice.reference })}
                                                    className="text-left font-semibold text-ink hover:underline"
                                                >
                                                    {tCategory(notice.category)}
                                                </button>
                                            </td>
                                            <td className="max-w-72 truncate px-3 py-3.5 text-ink-muted">{notice.locationExcerpt}</td>
                                            <td className="px-3 py-3.5 font-mono text-xs text-ink-muted">#{notice.reference}</td>
                                            <td className="px-5 py-3.5">
                                                <span className="inline-flex rounded-full bg-status-neutral-wash px-2.5 py-1 text-[11px] font-bold text-status-neutral">
                                                    {statusLabel(notice)}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <AdminPagination
                            pageInfo={data.page}
                            page={page}
                            summary={t('count', { count: data.page.totalElements })}
                            onPageChangeAction={setPage}
                        />
                    </>
                ) : null}
            </section>

            {/* One mount per opened notice: one logged NOTICE_VIEWED per opening */}
            {selectedId ? <NoticeDrawer key={selectedId} id={selectedId} onCloseAction={closeNotice} /> : null}
        </div>
    );
}
