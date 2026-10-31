'use client';

import { CalendarClock, Loader2, LockKeyhole } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { IncidentPausedNote } from '@/components/incident/IncidentPausedNote';
import { INCIDENT_MODE } from '@/lib/incident';

const ACTION_CLASS =
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 text-center text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40 lg:w-full';

/**
 * The draft's total and its one next step. Sticks above the tab bar on mobile so
 * the action and anything blocking it stay in view; sits at the foot of the
 * checkout card on desktop.
 */
export function DraftPayBar({
    totalLabel,
    error,
    startPassed,
    canPurchase,
    canPay,
    payDisabled,
    isPending,
    showConsentHint,
    onShowConsentAction,
    onPayAction,
    onChangeDateAction,
}: {
    totalLabel: string;
    error: string | null;
    startPassed: boolean;
    canPurchase: boolean;
    // False until the draft has a start date.
    canPay: boolean;
    payDisabled: boolean;
    isPending: boolean;
    showConsentHint: boolean;
    onShowConsentAction: () => void;
    onPayAction: () => void;
    onChangeDateAction: () => void;
}) {
    const t = useTranslations('ManagePage');
    const tCommon = useTranslations('Common');
    const tCreate = useTranslations('CreateEventPage');

    return (
        // The app shell's scroller keeps --tab-bar-h of bottom padding, which sticky
        // offsets count from; pull back over it so the bar rests on the 4rem tab bar,
        // and pull the page end in by the same amount so it still does at the bottom.
        // Tablets have no tab bar, so the bar rests on the bottom edge until lg puts it inline.
        <div className="sticky bottom-[calc(4rem-var(--tab-bar-h))] z-30 -mx-4 mb-[calc(4rem-var(--tab-bar-h))] border-t border-primary/20 bg-primary-light/90 px-4 py-3 shadow-[0_-8px_20px_-16px_rgba(18,20,28,0.35)] backdrop-blur md:bottom-0 md:mb-0 lg:static lg:mx-0 lg:mt-4 lg:mb-0 lg:border-border/70 lg:bg-transparent lg:px-0 lg:pt-4 lg:pb-0 lg:shadow-none lg:backdrop-blur-none">
            {/* Error */}
            {error && (
                <p role="alert" className="mb-2 text-sm text-rose-600">
                    {error}
                </p>
            )}

            {/* Consent hint */}
            {showConsentHint && (
                <button
                    type="button"
                    onClick={onShowConsentAction}
                    className="mb-2 flex min-h-8 items-center text-xs font-semibold text-primary-dark underline underline-offset-2"
                >
                    {tCreate('overview.consentHint')}
                </button>
            )}

            {/* Incident note */}
            <IncidentPausedNote className="mb-2" />

            {/* Co-host note */}
            {!canPurchase && <p className="mb-2 text-xs text-ink-muted">{tCommon('primaryHostOnly')}</p>}

            {/* Total and action */}
            <div className="flex items-center gap-3 lg:flex-col lg:items-stretch">
                <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold tracking-wide text-ink-faint uppercase">{tCreate('overview.dueNow')}</p>
                    <p className="truncate text-lg font-bold text-primary-dark lg:text-2xl">{totalLabel}</p>
                </div>

                {startPassed && canPurchase ? (
                    <button type="button" onClick={onChangeDateAction} className={ACTION_CLASS}>
                        <CalendarClock className="h-4 w-4" aria-hidden="true" />
                        {t('draft.startDate.action')}
                    </button>
                ) : canPay ? (
                    <button type="button" onClick={onPayAction} disabled={payDisabled || INCIDENT_MODE} className={ACTION_CLASS}>
                        {isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        ) : (
                            <LockKeyhole className="h-4 w-4" aria-hidden="true" />
                        )}
                        {isPending ? t('draft.openingCheckout') : t('draft.payAndPublish')}
                    </button>
                ) : (
                    <button type="button" disabled className={ACTION_CLASS}>
                        {t('draft.addStartDate')}
                    </button>
                )}
            </div>
        </div>
    );
}
