'use client';

import { Ban, CirclePause, CirclePlay } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { formatAdminDateTime } from '@/lib/adminWithdrawals';
import type { AdminEventDetailDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

// Why the event is suspended or closed, as the hosts were told, with the internal note under it.
// Only a suspension can be lifted; a close is final.
export function EventRestrictionBanner({
    suspension,
    onLiftAction,
}: {
    suspension: NonNullable<AdminEventDetailDto['suspension']>;
    onLiftAction: () => void;
}) {
    const t = useTranslations('AdminPage.events');
    const tStatement = useTranslations('ModerationStatement');
    const locale = useLocale();
    const closed = Boolean(suspension.closedAt);
    const decision = suspension.decision;
    const Icon = closed ? Ban : CirclePause;
    const reason = decision?.operationalReason
        ? t(`operationalReason.${decision.operationalReason}`)
        : decision?.rule
          ? tStatement(`rules.${decision.rule}`)
          : null;

    return (
        <section
            className={cn(
                'rounded-xl border p-5',
                closed ? 'border-status-danger/25 bg-status-danger-wash' : 'border-status-warn/25 bg-status-warn-wash',
            )}
        >
            {/* What happened and when */}
            <div className="flex flex-wrap items-start gap-3">
                <span
                    aria-hidden
                    className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-card', closed ? 'text-status-danger' : 'text-status-warn')}
                >
                    <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-ink">
                        {closed
                            ? t('restriction.closedOn', { date: formatAdminDateTime(locale, suspension.closedAt ?? suspension.suspendedAt) })
                            : t('restriction.suspendedOn', { date: formatAdminDateTime(locale, suspension.suspendedAt) })}
                    </p>
                    {reason && (
                        <p className="mt-0.5 text-sm text-ink-muted">
                            {reason}
                            {decision?.ground && !decision.operationalReason && ` · ${tStatement(`grounds.${decision.ground}`)}`}
                        </p>
                    )}
                </div>
                {!closed && (
                    <button
                        type="button"
                        onClick={onLiftAction}
                        className="inline-flex min-h-9 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-semibold text-ink transition-colors hover:bg-canvas"
                    >
                        <CirclePlay className="h-4 w-4" aria-hidden />
                        {t('restriction.lift')}
                    </button>
                )}
            </div>

            {/* The statement and the note */}
            {(decision?.explanation || decision?.note) && (
                <div className="mt-4 space-y-3 border-t border-ink/10 pt-4 sm:pl-11">
                    {decision.explanation && (
                        <div>
                            <p className="text-[11px] font-bold tracking-wide text-ink-faint uppercase">{t('restriction.explanation')}</p>
                            <p className="mt-1 text-sm whitespace-pre-line text-ink">{decision.explanation}</p>
                        </div>
                    )}
                    {decision.note && (
                        <div>
                            <p className="text-[11px] font-bold tracking-wide text-ink-faint uppercase">{t('restriction.note')}</p>
                            <p className="mt-1 text-sm whitespace-pre-line text-ink-muted">{decision.note}</p>
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}
