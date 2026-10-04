'use client';

import { useLocale, useTranslations } from 'next-intl';
import { type ChangeEvent, type FormEvent, type MouseEvent, useEffect, useRef, useState } from 'react';

import { AdminPagination } from '@/components/admin/betaFeedback/AdminPagination';
import { LoadingState } from '@/components/ui/LoadingState';
import { type NoticeEventFilters, useNoticeEventSearch } from '@/hooks/useAdminNotices';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { formatDate } from '@/lib/datetime';

export const NOTICE_TITLE_MAX_LENGTH = 200;
export const NOTICE_HOST_EMAIL_MAX_LENGTH = 320;

const INPUT = 'w-full rounded-md border border-border bg-canvas px-2 py-1.5 text-sm text-ink';

// Step 1 of attaching (§2.3): find the event. Searching shows event metadata only and writes no audit
// row. It runs on submit, so typing never sends a request.
export function NoticeEventSearch({
    noticeId,
    applied,
    onSearchAction,
    onPickAction,
}: {
    noticeId: string;
    // Owned by the drawer, so the filters survive a Back from the picker.
    applied: NoticeEventFilters;
    onSearchAction: (filters: NoticeEventFilters) => void;
    onPickAction: (eventId: string) => void;
}) {
    const t = useTranslations('AdminPage.moderation.notices');
    const locale = useLocale();
    const toErrorMessage = useApiErrorMessage();
    const [draft, setDraft] = useState<NoticeEventFilters>(applied);
    const headingRef = useRef<HTMLHeadingElement>(null);
    const [page, setPage] = useState(0);
    const query = useNoticeEventSearch(noticeId, applied, page);
    const data = query.data;

    // Entering the step, or coming back to it from the picker, puts focus here.
    useEffect(() => {
        headingRef.current?.focus();
    }, []);

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        onSearchAction(draft);
        setPage(0);
    }
    function changeTitle(event: ChangeEvent<HTMLInputElement>) {
        const q = event.currentTarget.value;
        setDraft((d) => ({ ...d, q }));
    }
    function changeHostEmail(event: ChangeEvent<HTMLInputElement>) {
        const hostEmail = event.currentTarget.value;
        setDraft((d) => ({ ...d, hostEmail }));
    }
    function changeDate(event: ChangeEvent<HTMLInputElement>) {
        const date = event.currentTarget.value;
        setDraft((d) => ({ ...d, date }));
    }
    function pick(event: MouseEvent<HTMLButtonElement>) {
        const eventId = event.currentTarget.dataset.eventId;
        if (eventId) onPickAction(eventId);
    }

    return (
        <section aria-labelledby="notice-search-heading" className="space-y-4">
            <h3
                ref={headingRef}
                tabIndex={-1}
                id="notice-search-heading"
                className="text-xs font-bold tracking-wide text-ink-faint uppercase outline-none"
            >
                {t('search.heading')}
            </h3>
            <form onSubmit={submit} className="space-y-3">
                <label className="block space-y-1 text-sm text-ink">
                    <span>{t('search.title')}</span>
                    <input type="text" value={draft.q} onChange={changeTitle} maxLength={NOTICE_TITLE_MAX_LENGTH} className={INPUT} />
                </label>
                <label className="block space-y-1 text-sm text-ink">
                    <span>{t('search.hostEmail')}</span>
                    <input
                        type="email"
                        value={draft.hostEmail}
                        onChange={changeHostEmail}
                        maxLength={NOTICE_HOST_EMAIL_MAX_LENGTH}
                        autoComplete="off"
                        className={INPUT}
                    />
                </label>
                <label className="block space-y-1 text-sm text-ink">
                    <span>{t('search.date')}</span>
                    <input type="date" value={draft.date} onChange={changeDate} className={INPUT} />
                </label>
                <button type="submit" className="rounded-md bg-ink px-3 py-1.5 text-sm font-semibold text-canvas">
                    {t('search.submit')}
                </button>
            </form>
            <p className="text-xs text-ink-muted">{t('search.noAudit')}</p>

            {query.isFetching && !data ? <LoadingState label={t('loading')} className="min-h-24" /> : null}
            {query.error ? (
                <p role="alert" className="text-sm text-status-danger">
                    {toErrorMessage(query.error)}
                </p>
            ) : null}
            {data && data.content.length === 0 ? <p className="text-sm text-ink-muted">{t('search.empty')}</p> : null}
            {data && data.content.length > 0 ? (
                <div className="overflow-hidden rounded-lg border border-border">
                    <ul>
                        {data.content.map((candidate) => (
                            <li
                                key={candidate.eventId}
                                className="flex items-center justify-between gap-3 border-b border-border p-3 text-sm last:border-b-0"
                            >
                                <div className="min-w-0">
                                    <p className="flex flex-wrap items-center gap-2">
                                        <span className="font-semibold break-words text-ink">{candidate.title}</span>
                                        {candidate.deleted ? (
                                            <span className="inline-flex rounded-full bg-status-warn-wash px-2.5 py-0.5 text-[11px] font-bold text-status-warn">
                                                {t('search.deleted')}
                                            </span>
                                        ) : null}
                                    </p>
                                    <p className="text-xs text-ink-muted">
                                        {formatDate(locale, candidate.startAt, { dateStyle: 'medium' })}
                                        {candidate.primaryHostName ? ` · ${t('search.primaryHost')}: ${candidate.primaryHostName}` : ''}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    data-event-id={candidate.eventId}
                                    onClick={pick}
                                    aria-label={t('search.chooseEvent', { title: candidate.title })}
                                    className="shrink-0 rounded-md bg-ink px-3 py-1.5 text-sm font-semibold text-canvas"
                                >
                                    {t('search.choose')}
                                </button>
                            </li>
                        ))}
                    </ul>
                    <AdminPagination
                        pageInfo={data.page}
                        page={page}
                        summary={t('search.count', { count: data.page.totalElements })}
                        onPageChangeAction={setPage}
                    />
                </div>
            ) : null}
        </section>
    );
}
