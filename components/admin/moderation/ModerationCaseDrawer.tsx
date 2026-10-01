'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminIdentifier } from '@/components/admin/AdminIdentifier';
import { ModerationContentPreview } from '@/components/admin/moderation/ModerationContentPreview';
import { ModerationDecisionForm } from '@/components/admin/moderation/ModerationDecisionForm';
import { ModerationHistory } from '@/components/admin/moderation/ModerationHistory';
import { LoadingState } from '@/components/ui/LoadingState';
import { useAdminModerationCase, useDecideModerationCase, useLiftEventBan, useStartModerationReview } from '@/hooks/useAdminModeration';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import type { ModerationDecisionRequestDto, ReportTargetType } from '@/lib/api/types';
import { formatDate } from '@/lib/datetime';

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

    const decideError = decide.error ? toErrorMessage(decide.error) : null;

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
            {error ? <p className="text-sm text-status-danger">{toErrorMessage(error)}</p> : null}

            {detail ? (
                <div className="space-y-7">
                    {startReview.error ? <p className="text-sm text-status-danger">{toErrorMessage(startReview.error)}</p> : null}

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
                                    <p className="font-semibold text-ink">{tReport(`reasons.${r.reason}`)}</p>
                                    {r.description ? <p className="mt-1 break-words whitespace-pre-wrap text-ink">{r.description}</p> : null}
                                    <p className="mt-1 text-xs text-ink-muted">
                                        {r.reporterDisplayName ?? t('reporterGone')} ·{' '}
                                        {formatDate(locale, r.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}
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
                    {liftBan.error ? <p className="text-sm text-status-danger">{toErrorMessage(liftBan.error)}</p> : null}

                    {/* Decision. A 5106 refetch closes the case under the form, so its refusal stays visible here. */}
                    {detail.status !== 'CLOSED' ? (
                        <ModerationDecisionForm
                            allowed={detail.allowedActions}
                            contentPresent={detail.content !== null}
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
