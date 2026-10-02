'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { type ChangeEvent, type ReactNode, useEffect, useRef, useState } from 'react';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { NoticeEventSearch } from '@/components/admin/moderation/notices/NoticeEventSearch';
import { NoticeItemPicker } from '@/components/admin/moderation/notices/NoticeItemPicker';
import { LoadingState } from '@/components/ui/LoadingState';
import { clearNoticeBrowse, type NoticeEventFilters, useAdminNotice, useAttachNotice, useCloseNotice } from '@/hooks/useAdminNotices';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { type ContentNoticeDetailDto, NOTICE_CLOSE_REASONS, type NoticeCloseReason, type NoticeItemCandidateDto } from '@/lib/api/types';
import { formatDate } from '@/lib/datetime';

export const NOTICE_CLOSE_NOTE_MAX_LENGTH = 2000;

const NO_FILTERS: NoticeEventFilters = { q: '', hostEmail: '', date: '' };

type Mode = 'idle' | 'find' | 'close';

// The link is the notifier's text: only a real http(s) URL becomes clickable.
const HTTP_URL = /^https?:\/\//i;
const DATE_TIME: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' };

function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="space-y-0.5">
            <dt className="text-[11px] font-bold tracking-wide text-ink-faint uppercase">{label}</dt>
            <dd className="text-sm break-words whitespace-pre-wrap text-ink">{children}</dd>
        </div>
    );
}

// One notice (§2.2). Mounted per opening, so the single NOTICE_VIEWED fetch happens once. Both mutations
// live here, not in the steps: a 5109 refetch moves the notice off NEW and unmounts them, and the refusal
// must stay on screen.
export function NoticeDrawer({ id, onCloseAction }: { id: string; onCloseAction: () => void }) {
    const t = useTranslations('AdminPage.moderation.notices');
    const tCategory = useTranslations('ContentNoticeForm.categories');
    const tMod = useTranslations('AdminPage.moderation');
    const tApiErrors = useTranslations('ApiErrors');
    const queryClient = useQueryClient();
    const locale = useLocale();
    const toErrorMessage = useApiErrorMessage();
    const { data: notice, error, isLoading } = useAdminNotice(id);
    const attach = useAttachNotice();
    const close = useCloseNotice();
    const [mode, setMode] = useState<Mode>('idle');
    const [eventId, setEventId] = useState<string | null>(null);
    const [reason, setReason] = useState<NoticeCloseReason | null>(null);
    const [note, setNote] = useState('');
    const [filters, setFilters] = useState<NoticeEventFilters>(NO_FILTERS);
    // Set once the notice has been seen as NEW: if it later leaves NEW without one of our own mutations
    // succeeding, another admin handled it (a 5109 on a browse query refetches the notice).
    const [wasNew, setWasNew] = useState(false);
    if (notice?.status === 'NEW' && !wasNew) setWasNew(true);
    const modeRef = useRef<HTMLDivElement>(null);
    const findRef = useRef<HTMLButtonElement>(null);
    const previousMode = useRef<Mode>('idle');

    // Page 0 of each type is a logged browse, so a closed or abandoned picker must not leave cached pages
    // behind. Unmount only: safe in StrictMode because no browse cache exists yet when it first runs.
    useEffect(() => () => clearNoticeBrowse(queryClient, id), [queryClient, id]);

    // Focus follows the step: into it on entering, back to the action buttons on leaving.
    useEffect(() => {
        // The find step focuses its own heading (search, then picker).
        if (mode === 'close') modeRef.current?.focus();
        else if (previousMode.current !== 'idle') findRef.current?.focus();
        previousMode.current = mode;
    }, [mode]);

    function startFind() {
        setMode('find');
    }
    function startClose() {
        setMode('close');
    }
    function backToIdle() {
        clearNoticeBrowse(queryClient, id);
        setMode('idle');
        setEventId(null);
    }
    function backToSearch() {
        clearNoticeBrowse(queryClient, id);
        setEventId(null);
    }
    function search(next: NoticeEventFilters) {
        setFilters(next);
    }
    function pickEvent(next: string) {
        setEventId(next);
    }
    function selectReason(event: ChangeEvent<HTMLInputElement>) {
        setReason(event.currentTarget.value as NoticeCloseReason);
    }
    function changeNote(event: ChangeEvent<HTMLTextAreaElement>) {
        setNote(event.currentTarget.value.slice(0, NOTICE_CLOSE_NOTE_MAX_LENGTH));
    }
    function submitAttach(item: NoticeItemCandidateDto) {
        if (!eventId) return;
        attach.mutate({ id, eventId, targetType: item.targetType, targetId: item.targetId }, { onSuccess: onCloseAction });
    }
    function submitClose() {
        if (!reason || close.isPending) return;
        close.mutate({ id, reason, note: note.trim() === '' ? null : note.trim() }, { onSuccess: onCloseAction });
    }

    const mutationError = attach.error ?? close.error;
    const handledElsewhere =
        wasNew &&
        notice !== undefined &&
        notice.status !== 'NEW' &&
        !attach.isPending &&
        !close.isPending &&
        !attach.isSuccess &&
        !close.isSuccess &&
        !mutationError;

    return (
        <AdminDrawer
            open
            onClose={onCloseAction}
            closeLabel={tMod('close')}
            title={notice ? t('drawerTitle', { reference: notice.reference }) : t('loading')}
            size="wide"
        >
            {isLoading ? <LoadingState label={t('loading')} className="min-h-48" /> : null}
            {error ? (
                <p role="alert" className="text-sm text-status-danger">
                    {toErrorMessage(error)}
                </p>
            ) : null}

            {notice ? (
                <div className="space-y-7">
                    <dl className="space-y-4">
                        <Field label={t('fields.category')}>{tCategory(notice.category)}</Field>
                        <Field label={t('fields.location')}>{notice.locationText}</Field>
                        {notice.link ? (
                            <Field label={t('fields.link')}>
                                {HTTP_URL.test(notice.link) ? (
                                    <a href={notice.link} target="_blank" rel="noopener noreferrer nofollow" className="underline">
                                        {notice.link}
                                    </a>
                                ) : (
                                    notice.link
                                )}
                            </Field>
                        ) : null}
                        <Field label={t('fields.explanation')}>{notice.explanation}</Field>
                        {notice.notifierName || notice.notifierEmail ? (
                            <>
                                {notice.notifierName ? <Field label={t('fields.name')}>{notice.notifierName}</Field> : null}
                                {notice.notifierEmail ? <Field label={t('fields.email')}>{notice.notifierEmail}</Field> : null}
                            </>
                        ) : (
                            <Field label={t('fields.name')}>{t('noIdentity')}</Field>
                        )}
                        <Field label={t('fields.locale')}>{notice.locale}</Field>
                        <Field label={t('fields.received')}>{formatDate(locale, notice.createdAt, DATE_TIME)}</Field>
                        {notice.handledAt ? <Field label={t('fields.handledAt')}>{formatDate(locale, notice.handledAt, DATE_TIME)}</Field> : null}
                    </dl>

                    <HandledSection notice={notice} />

                    {notice.status === 'NEW' ? (
                        <div className="space-y-4 border-t border-border pt-5">
                            {mode === 'idle' ? (
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        ref={findRef}
                                        type="button"
                                        onClick={startFind}
                                        className="rounded-md bg-ink px-3 py-1.5 text-sm font-semibold text-canvas"
                                    >
                                        {t('actions.find')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={startClose}
                                        className="rounded-md px-3 py-1.5 text-sm font-semibold text-ink-muted hover:bg-canvas"
                                    >
                                        {t('actions.close')}
                                    </button>
                                </div>
                            ) : null}

                            {mode === 'find' ? (
                                <div ref={modeRef} tabIndex={-1} className="space-y-4 outline-none">
                                    {eventId ? (
                                        <NoticeItemPicker
                                            noticeId={id}
                                            eventId={eventId}
                                            isAttaching={attach.isPending}
                                            onBackAction={backToSearch}
                                            onAttachAction={submitAttach}
                                        />
                                    ) : (
                                        <>
                                            <NoticeEventSearch noticeId={id} applied={filters} onSearchAction={search} onPickAction={pickEvent} />
                                            <button
                                                type="button"
                                                onClick={backToIdle}
                                                className="rounded-md px-3 py-1.5 text-sm font-semibold text-ink-muted hover:bg-canvas"
                                            >
                                                {t('actions.back')}
                                            </button>
                                        </>
                                    )}
                                </div>
                            ) : null}

                            {mode === 'close' ? (
                                <div ref={modeRef} tabIndex={-1} className="space-y-4 outline-none">
                                    <fieldset className="space-y-2" disabled={close.isPending}>
                                        <legend className="text-xs font-bold tracking-wide text-ink-faint uppercase">{t('actions.close')}</legend>
                                        {NOTICE_CLOSE_REASONS.map((option) => (
                                            <label key={option} className="flex items-center gap-2 text-sm text-ink">
                                                <input
                                                    type="radio"
                                                    name="notice-close-reason"
                                                    value={option}
                                                    checked={reason === option}
                                                    onChange={selectReason}
                                                />
                                                {t(`closeReasons.${option}`)}
                                            </label>
                                        ))}
                                        <label className="block space-y-1 text-sm text-ink">
                                            <span>{t('closeNote')}</span>
                                            <textarea
                                                value={note}
                                                onChange={changeNote}
                                                maxLength={NOTICE_CLOSE_NOTE_MAX_LENGTH}
                                                rows={3}
                                                className="w-full rounded-md border border-border bg-canvas p-2 text-sm"
                                            />
                                        </label>
                                    </fieldset>
                                    <p className="text-xs text-ink-muted">{t('closeEmailsNotifier')}</p>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={backToIdle}
                                            disabled={close.isPending}
                                            className="rounded-md px-3 py-1.5 text-sm font-semibold text-ink-muted hover:bg-canvas disabled:opacity-50"
                                        >
                                            {t('actions.back')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={submitClose}
                                            disabled={!reason || close.isPending}
                                            className="rounded-md bg-status-danger px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
                                        >
                                            {t('actions.confirmClose')}
                                        </button>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    ) : null}
                </div>
            ) : null}

            {handledElsewhere ? (
                <p role="alert" className="mt-4 text-sm text-status-danger">
                    {tApiErrors('noticeAlreadyHandled')}
                </p>
            ) : null}
            {mutationError ? (
                <p role="alert" className="mt-4 text-sm text-status-danger">
                    {toErrorMessage(mutationError)}
                </p>
            ) : null}
        </AdminDrawer>
    );
}

// ATTACHED and CLOSED notices: what happened to them. No actions, and no link to the case (the
// moderation panel has no route to open one).
function HandledSection({ notice }: { notice: ContentNoticeDetailDto }) {
    const t = useTranslations('AdminPage.moderation.notices');
    const tTypes = useTranslations('AdminPage.moderation.types');
    const tOutcome = useTranslations('AdminPage.moderation.outcome');
    if (notice.status === 'ATTACHED') {
        return (
            <dl className="space-y-4 border-t border-border pt-5">
                <Field label={t('fields.attachedTo')}>
                    {notice.attachment ? tTypes(notice.attachment.targetType) : t('attachmentGone')}
                    {' · '}
                    {notice.outcome ? tOutcome(notice.outcome) : t('pending')}
                </Field>
            </dl>
        );
    }
    if (notice.status === 'CLOSED') {
        return (
            <dl className="space-y-4 border-t border-border pt-5">
                {notice.closeReason ? <Field label={t('fields.closeReason')}>{t(`closeReasons.${notice.closeReason}`)}</Field> : null}
                {notice.closeNote ? <Field label={t('fields.closeNote')}>{notice.closeNote}</Field> : null}
            </dl>
        );
    }
    return null;
}
