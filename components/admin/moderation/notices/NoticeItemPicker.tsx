'use client';

import { useLocale, useTranslations } from 'next-intl';
import { type ChangeEvent, useEffect, useRef, useState } from 'react';

import { AdminPagination } from '@/components/admin/betaFeedback/AdminPagination';
import { LoadingState } from '@/components/ui/LoadingState';
import { useNoticeItems } from '@/hooks/useAdminNotices';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import type { NoticeItemCandidateDto, ReportTargetType } from '@/lib/api/types';
import { formatDate } from '@/lib/datetime';

export const NOTICE_ITEM_TYPES: readonly ReportTargetType[] = [
    'MEDIA',
    'POST',
    'COMMENT',
    'STORY',
    'WISHBOOK_ENTRY',
    'PLAYLIST_SUGGESTION',
    'MEMBER',
];

// Step 2 of attaching (§2.4, §2.5). Page 0 of each type is a logged EVENT_BROWSED, so only the
// selected type is ever fetched. The drawer drops the cache (on Back and on unmount), so reopening
// the picker is a new, logged browse.
export function NoticeItemPicker({
    noticeId,
    eventId,
    isAttaching,
    onBackAction,
    onAttachAction,
}: {
    noticeId: string;
    eventId: string;
    // The drawer owns the mutation: a 5109 refetch unmounts this picker, and the refusal must outlive it.
    isAttaching: boolean;
    onBackAction: () => void;
    onAttachAction: (item: NoticeItemCandidateDto) => void;
}) {
    const t = useTranslations('AdminPage.moderation.notices');
    const tTypes = useTranslations('AdminPage.moderation.types');
    const locale = useLocale();
    const toErrorMessage = useApiErrorMessage();
    const [type, setType] = useState<ReportTargetType>('MEDIA');
    const [page, setPage] = useState(0);
    const [selected, setSelected] = useState<NoticeItemCandidateDto | null>(null);
    const [confirming, setConfirming] = useState(false);
    const query = useNoticeItems(noticeId, eventId, type, page);
    const data = query.data;
    const headingRef = useRef<HTMLHeadingElement>(null);
    const confirmRef = useRef<HTMLDivElement>(null);
    const attachRef = useRef<HTMLButtonElement>(null);
    const wasConfirming = useRef(false);

    // Focus follows the step: into the picker on entering, into the confirm group on Attach, and back to
    // Attach when leaving the confirm (the focused button is destroyed by the swap).
    useEffect(() => {
        headingRef.current?.focus();
    }, []);
    useEffect(() => {
        if (confirming) confirmRef.current?.focus();
        else if (wasConfirming.current) attachRef.current?.focus();
        wasConfirming.current = confirming;
    }, [confirming]);

    function selectType(event: ChangeEvent<HTMLSelectElement>) {
        setType(event.currentTarget.value as ReportTargetType);
        setPage(0);
        setSelected(null);
        setConfirming(false);
    }
    function changePage(next: number) {
        setPage(next);
        setSelected(null);
        setConfirming(false);
    }
    function selectItem(event: ChangeEvent<HTMLInputElement>) {
        const item = data?.content.find((candidate) => candidate.targetId === event.currentTarget.value) ?? null;
        setSelected(item);
        setConfirming(false);
    }
    function review() {
        setConfirming(true);
    }
    function back() {
        setConfirming(false);
    }
    function confirm() {
        if (selected && !isAttaching) onAttachAction(selected);
    }

    const itemLabel = (item: NoticeItemCandidateDto) =>
        `${item.authorDisplayName ?? t('picker.anonymous')} · ${formatDate(locale, item.createdAt, { dateStyle: 'medium' })}`;

    return (
        <section aria-labelledby="notice-picker-heading" className="space-y-4">
            <h3
                ref={headingRef}
                tabIndex={-1}
                id="notice-picker-heading"
                className="text-xs font-bold tracking-wide text-ink-faint uppercase outline-none"
            >
                {t('picker.heading')}
            </h3>
            <p className="text-xs text-ink-muted">{t('picker.audited')}</p>

            <label className="block space-y-1 text-sm text-ink">
                <span>{t('picker.type')}</span>
                <select
                    value={type}
                    onChange={selectType}
                    disabled={isAttaching}
                    className="w-full rounded-md border border-border bg-canvas px-2 py-1.5 text-sm text-ink"
                >
                    {NOTICE_ITEM_TYPES.map((option) => (
                        <option key={option} value={option}>
                            {tTypes(option)}
                        </option>
                    ))}
                </select>
            </label>

            {query.isLoading ? <LoadingState label={t('loading')} className="min-h-24" /> : null}
            {query.error ? (
                <p role="alert" className="text-sm text-status-danger">
                    {toErrorMessage(query.error)}
                </p>
            ) : null}
            {data && data.content.length === 0 ? <p className="text-sm text-ink-muted">{t('picker.empty')}</p> : null}
            {data && data.content.length > 0 ? (
                <div className="overflow-hidden rounded-lg border border-border">
                    <fieldset disabled={isAttaching}>
                        <legend className="sr-only">{t('picker.items')}</legend>
                        <ul className={type === 'MEDIA' ? 'grid grid-cols-2 gap-3 p-3 sm:grid-cols-3' : ''}>
                            {data.content.map((item) => (
                                <li key={item.targetId} className={type === 'MEDIA' ? '' : 'border-b border-border last:border-b-0'}>
                                    <label
                                        className={
                                            type === 'MEDIA'
                                                ? 'block space-y-1 text-xs text-ink-muted'
                                                : 'flex items-start gap-2 p-3 text-sm text-ink'
                                        }
                                    >
                                        <input
                                            type="radio"
                                            name="notice-item"
                                            value={item.targetId}
                                            checked={selected?.targetId === item.targetId}
                                            onChange={selectItem}
                                        />
                                        {type === 'MEDIA' ? (
                                            <>
                                                {item.thumbnailUrl ? (
                                                    // Presigned, short-lived URL: next/image would cache it past expiry.
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img
                                                        src={item.thumbnailUrl}
                                                        alt=""
                                                        className="aspect-square w-full rounded-md border border-border object-cover"
                                                    />
                                                ) : null}
                                                <span className="block">{itemLabel(item)}</span>
                                            </>
                                        ) : (
                                            <span className="min-w-0">
                                                {item.text ? <span className="block break-words whitespace-pre-wrap">{item.text}</span> : null}
                                                <span className="block text-xs text-ink-muted">{itemLabel(item)}</span>
                                            </span>
                                        )}
                                    </label>
                                </li>
                            ))}
                        </ul>
                    </fieldset>
                    <AdminPagination
                        pageInfo={data.page}
                        page={page}
                        summary={t('count', { count: data.page.totalElements })}
                        onPageChangeAction={changePage}
                    />
                </div>
            ) : null}

            {confirming && selected ? (
                <div
                    ref={confirmRef}
                    tabIndex={-1}
                    role="group"
                    aria-label={t('actions.confirmAttach')}
                    className="space-y-3 rounded-lg border border-status-danger-wash p-4 outline-none"
                >
                    <p className="text-sm font-semibold text-ink">{t('actions.confirmAttach')}</p>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={back}
                            disabled={isAttaching}
                            className="rounded-md px-3 py-1.5 text-sm font-semibold text-ink-muted hover:bg-canvas disabled:opacity-50"
                        >
                            {t('actions.back')}
                        </button>
                        <button
                            type="button"
                            onClick={confirm}
                            disabled={isAttaching}
                            className="rounded-md bg-status-danger px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
                        >
                            {t('actions.confirmAttachButton')}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={onBackAction}
                        className="rounded-md px-3 py-1.5 text-sm font-semibold text-ink-muted hover:bg-canvas"
                    >
                        {t('actions.back')}
                    </button>
                    <button
                        ref={attachRef}
                        type="button"
                        onClick={review}
                        disabled={!selected}
                        className="rounded-md bg-ink px-3 py-1.5 text-sm font-semibold text-canvas disabled:opacity-50"
                    >
                        {t('actions.attach')}
                    </button>
                </div>
            )}
        </section>
    );
}
