'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminIdentifier } from '@/components/admin/AdminIdentifier';
import { ModerationContentPreview } from '@/components/admin/moderation/ModerationContentPreview';
import { ModerationDecisionForm } from '@/components/admin/moderation/ModerationDecisionForm';
import { ModerationHistory } from '@/components/admin/moderation/ModerationHistory';
import { LoadingState } from '@/components/ui/LoadingState';
import {
    useAdminModerationCase,
    useCloseEventSuspension,
    useDecideModerationCase,
    useLiftEventBan,
    useLiftEventSuspension,
    useStartModerationReview,
} from '@/hooks/useAdminModeration';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import type { ModerationDecisionRequestDto, ReportTargetType } from '@/lib/api/types';
import { formatDate } from '@/lib/datetime';

// Reports a decision closes (guide §1); RESOLVED and DISMISSED ones were closed earlier.
const ACTIVE_REPORT_STATUSES = new Set(['OPEN', 'UNDER_REVIEW']);
const KNOWN_REPORT_STATUSES = new Set(['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED']);

// One case: the item, every report on it, its history, and the decision form (guide §2.2–§2.5).
// Mounted per case (keyed by target), so the review claim below runs once per opening.
export function ModerationCaseDrawer({
    targetType,
    targetId,
    onCloseAction,
}: {
    targetType: ReportTargetType;
    targetId: string;
    onCloseAction: () => void;
}) {
    const t = useTranslations('AdminPage.moderation');
    const tReport = useTranslations('Report');
    const locale = useLocale();
    const toErrorMessage = useApiErrorMessage();
    const { data: detail, error, isLoading } = useAdminModerationCase(targetType, targetId);
    const startReview = useStartModerationReview();
    const decide = useDecideModerationCase();
    const liftBan = useLiftEventBan();
    const liftSuspension = useLiftEventSuspension();
    const closeSuspension = useCloseEventSuspension();
    // Which suspension action is waiting for its confirm. Closing is permanent, so both ask first.
    const [confirming, setConfirming] = useState<'lift' | 'close' | null>(null);
    const suspensionPending = liftSuspension.isPending || closeSuspension.isPending;
    const startReviewMutate = startReview.mutate;
    // A ref, not state: StrictMode's second effect run (and any re-render) must not POST again.
    const reviewRequested = useRef(false);

    // Opening an OPEN case claims it for review, once. A repeat would be a harmless 204 anyway.
    useEffect(() => {
        if (detail?.status === 'OPEN' && !reviewRequested.current) {
            reviewRequested.current = true;
            startReviewMutate({ targetType, targetId });
        }
    }, [detail?.status, startReviewMutate, targetId, targetType]);

    function submitDecision(request: Required<ModerationDecisionRequestDto>) {
        decide.mutate({ targetType, targetId, request }, { onSuccess: onCloseAction });
    }
    function lift(banId: string) {
        liftBan.mutate({ banId, targetType, targetId });
    }
    function askLift() {
        setConfirming('lift');
    }
    function askClose() {
        setConfirming('close');
    }
    function cancelSuspensionAction() {
        setConfirming(null);
    }
    function confirmSuspensionAction() {
        if (!detail || !confirming) return;
        const variables = { eventId: detail.eventId, targetType, targetId };
        if (confirming === 'lift') liftSuspension.mutate(variables, { onSuccess: cancelSuspensionAction });
        else closeSuspension.mutate(variables, { onSuccess: cancelSuspensionAction });
    }

    const decideError = decide.error ? toErrorMessage(decide.error) : null;
    const activeReportCount = detail ? detail.reports.filter((r) => ACTIVE_REPORT_STATUSES.has(r.status)).length : 0;

    return (
        <AdminDrawer
            open
            onClose={onCloseAction}
            closeLabel={t('close')}
            title={t('caseTitle')}
            subtitle={detail?.eventTitle ?? undefined}
            size="wide"
        >
            {isLoading ? <LoadingState label={t('loading')} className="min-h-48" /> : null}
            {error ? (
                <p role="alert" className="text-sm text-status-danger">
                    {toErrorMessage(error)}
                </p>
            ) : null}

            {detail ? (
                <div className="space-y-7">
                    {startReview.error ? (
                        <p role="alert" className="text-sm text-status-danger">
                            {toErrorMessage(startReview.error)}
                        </p>
                    ) : null}

                    {/* Reported item */}
                    <ModerationContentPreview content={detail.content} />

                    {/* Reports */}
                    <section className="space-y-2">
                        <h3 className="text-xs font-bold tracking-wide text-ink-faint uppercase">
                            {t('reportsHeading', { count: detail.reports.length })}
                        </h3>
                        <ul className="space-y-3">
                            {detail.reports.map((r) => (
                                <li key={r.id} className="rounded-lg border border-border p-3 text-sm">
                                    <p className="flex flex-wrap items-center gap-2">
                                        <span className="font-semibold text-ink">{tReport(`reasons.${r.reason}`)}</span>
                                        <span
                                            className={
                                                ACTIVE_REPORT_STATUSES.has(r.status)
                                                    ? 'inline-flex rounded-full bg-status-warn-wash px-2.5 py-0.5 text-[11px] font-bold text-status-warn'
                                                    : 'inline-flex rounded-full bg-status-neutral-wash px-2.5 py-0.5 text-[11px] font-bold text-status-neutral'
                                            }
                                        >
                                            {KNOWN_REPORT_STATUSES.has(r.status) ? t(`reportStatus.${r.status}`) : r.status}
                                        </span>
                                    </p>
                                    {r.description ? <p className="mt-1 break-words whitespace-pre-wrap text-ink">{r.description}</p> : null}
                                    <p className="mt-1 text-xs text-ink-muted">
                                        {r.noticeReference
                                            ? t('publicNotice', { reference: r.noticeReference })
                                            : (r.reporterDisplayName ?? t('reporterGone'))}{' '}
                                        · {formatDate(locale, r.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    </section>

                    {/* History */}
                    <ModerationHistory
                        decisions={detail.decisions}
                        priorDecisions={detail.priorDecisionsAgainstAuthor}
                        bans={detail.bans}
                        onLiftBanAction={lift}
                        liftingBanId={liftBan.isPending ? (liftBan.variables?.banId ?? null) : null}
                    />
                    {liftBan.error ? (
                        <p role="alert" className="text-sm text-status-danger">
                            {toErrorMessage(liftBan.error)}
                        </p>
                    ) : null}

                    {/* StoryWall suspension, set by this case or another */}
                    {detail.eventSuspension ? (
                        <section className="space-y-2 rounded-lg border border-status-danger-wash p-3 text-sm">
                            <p className="text-ink">
                                {detail.eventSuspension.closedAt
                                    ? t('suspension.closedStatus', {
                                          date: formatDate(locale, detail.eventSuspension.closedAt, { dateStyle: 'medium', timeStyle: 'short' }),
                                          deletesOn: formatDate(locale, detail.eventSuspension.deletesOn, { dateStyle: 'medium' }),
                                      })
                                    : t('suspension.status', {
                                          date: formatDate(locale, detail.eventSuspension.suspendedAt, { dateStyle: 'medium', timeStyle: 'short' }),
                                      })}
                            </p>
                            {/* A closed StoryWall can't be lifted or closed again: no buttons. */}
                            {detail.eventSuspension.closedAt ? null : confirming ? (
                                <div className="space-y-2">
                                    <p className="text-ink">
                                        {confirming === 'lift'
                                            ? t('suspension.liftConfirm')
                                            : t('suspension.closeConfirm', {
                                                  deletesOn: formatDate(locale, detail.eventSuspension.deletesOn, { dateStyle: 'medium' }),
                                              })}
                                    </p>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={cancelSuspensionAction}
                                            disabled={suspensionPending}
                                            className="rounded-md px-3 py-1.5 text-sm font-semibold text-ink-muted hover:bg-canvas disabled:opacity-50"
                                        >
                                            {t('suspension.cancel')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={confirmSuspensionAction}
                                            disabled={suspensionPending}
                                            className={
                                                confirming === 'close'
                                                    ? 'rounded-md bg-status-danger px-3 py-1.5 text-sm font-semibold text-canvas disabled:opacity-50'
                                                    : 'rounded-md bg-ink px-3 py-1.5 text-sm font-semibold text-canvas disabled:opacity-50'
                                            }
                                        >
                                            {confirming === 'lift' ? t('suspension.liftConfirmButton') : t('suspension.closeConfirmButton')}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={askLift}
                                        className="rounded-md px-3 py-1.5 text-sm font-semibold text-ink-muted transition-colors hover:bg-canvas hover:text-ink"
                                    >
                                        {t('suspension.lift')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={askClose}
                                        className="rounded-md px-3 py-1.5 text-sm font-semibold text-status-danger transition-colors hover:bg-status-danger-wash"
                                    >
                                        {t('suspension.close')}
                                    </button>
                                </div>
                            )}
                        </section>
                    ) : null}
                    {liftSuspension.error || closeSuspension.error ? (
                        <p role="alert" className="text-sm text-status-danger">
                            {toErrorMessage(liftSuspension.error ?? closeSuspension.error)}
                        </p>
                    ) : null}

                    {/* Decision. A 5106 refetch closes the case under the form, so its refusal stays visible here. */}
                    {detail.status !== 'CLOSED' ? (
                        <ModerationDecisionForm
                            allowed={detail.allowedActions}
                            contentPresent={detail.content !== null}
                            activeReportCount={activeReportCount}
                            isSubmitting={decide.isPending}
                            error={decideError}
                            onSubmitAction={submitDecision}
                        />
                    ) : decideError ? (
                        <p role="alert" className="text-sm text-status-danger">
                            {decideError}
                        </p>
                    ) : null}

                    {/* Identifiers */}
                    <section className="grid grid-cols-1 gap-4 border-t border-border pt-5 sm:grid-cols-2">
                        <AdminIdentifier label={t('targetId')} value={detail.targetId} />
                        <AdminIdentifier label={t('eventId')} value={detail.eventId} />
                        {detail.content?.authorUserId ? <AdminIdentifier label={t('authorUserId')} value={detail.content.authorUserId} /> : null}
                    </section>
                </div>
            ) : null}
        </AdminDrawer>
    );
}
