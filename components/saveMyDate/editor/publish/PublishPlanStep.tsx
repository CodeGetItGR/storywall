'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId } from 'react';

import { WithdrawalConsentSection } from '@/components/checkout/WithdrawalConsentSection';
import { EventPlanSelector } from '@/components/plan/EventPlanSelector';
import { DateTimeField } from '@/components/ui/DateTimeField';
import type { InvitationEventCheckout } from '@/hooks/useInvitationEventCheckout';

type PublishPlanStepProps = {
    checkout: InvitationEventCheckout;
    // Back to the host's events, when there are some to choose.
    onBack: (() => void) | null;
    onCancel: () => void;
};

const FIELD_CLASS = 'h-11 w-full rounded-xl border border-border bg-white px-3 text-ink outline-none focus:ring-2 focus:ring-primary';

// A new event from the invitation: its plan and length, what the invitation doesn't say, and payment.
export function PublishPlanStep({ checkout, onBack, onCancel }: PublishPlanStepProps) {
    const t = useTranslations('InvitationEditor');
    const titleId = useId();
    const hasPlans = checkout.isLoadingPlans || checkout.plans.length > 0;

    return (
        <form onSubmit={checkout.submit} noValidate className="flex flex-col gap-5">
            {/* Title */}
            <h2 className="pr-10 text-base font-semibold">{t('choosePlan')}</h2>

            {/* Plans */}
            {hasPlans ? (
                <EventPlanSelector
                    plans={checkout.plans}
                    modules={checkout.modules}
                    media={checkout.media}
                    selectedCode={checkout.selectedCode}
                    durationPicks={checkout.durationPicks}
                    onSelectAction={checkout.selectPlan}
                    onSelectDurationAction={checkout.selectDuration}
                    isLoading={checkout.isLoadingPlans}
                />
            ) : (
                <p className="text-ink-muted">{t('noInvitationPlans')}</p>
            )}

            {/* Event details the invitation doesn't give */}
            {hasPlans && checkout.needsTitle && (
                <div className="flex flex-col gap-1.5">
                    <label htmlFor={titleId} className="font-medium">
                        {t('eventName')}
                    </label>
                    <input id={titleId} value={checkout.title} onChange={checkout.onTitleChange} maxLength={255} className={FIELD_CLASS} />
                </div>
            )}
            {hasPlans && checkout.needsStart && (
                <fieldset className="flex flex-col gap-1.5">
                    <legend className="mb-1.5 font-medium">{t('eventStart')}</legend>
                    <DateTimeField
                        value={checkout.startAt}
                        onChange={checkout.onStartAtChange}
                        min={checkout.startAtMin}
                        inputClassName={FIELD_CLASS}
                    />
                </fieldset>
            )}

            {/* Consent */}
            {hasPlans && (
                <WithdrawalConsentSection
                    requestsImmediateStart={checkout.consent.requestsImmediateStart}
                    acknowledgesWithdrawalTerms={checkout.consent.acknowledgesWithdrawalTerms}
                    staleTerms={checkout.consent.staleTerms}
                    onRequestsImmediateStartChangeAction={checkout.consent.handleRequestsImmediateStartChange}
                    onAcknowledgesWithdrawalTermsChangeAction={checkout.consent.handleAcknowledgesWithdrawalTermsChange}
                />
            )}

            {/* Failure */}
            {checkout.error && (
                <p role="alert" className="font-medium text-rose-700">
                    {checkout.error}
                </p>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2">
                <button
                    type="button"
                    onClick={onBack ?? onCancel}
                    disabled={checkout.isPending}
                    className="rounded-full bg-surface-muted px-4 py-2 font-medium text-ink-muted transition-colors hover:text-ink disabled:opacity-60"
                >
                    {onBack ? t('back') : t('cancel')}
                </button>
                {hasPlans && (
                    <button
                        type="submit"
                        disabled={!checkout.canSubmit}
                        className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 font-semibold text-primary-foreground transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {checkout.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                        {t('continueToPayment')}
                    </button>
                )}
            </div>
        </form>
    );
}
