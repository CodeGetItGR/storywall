'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useCreateEventForm } from '@/providers/createEvent/CreateEventFormContext';

export function EventCreateFooter() {
    const t = useTranslations('CreateEventPage');
    const {
        step,
        formId,
        canContinueType,
        canContinuePlan,
        isSubmitPending,
        hasDraft,
        canSubmitDetails,
        isEmailVerified,
        goToType,
        goToDetails,
        goToPlan,
    } = useCreateEventForm();

    return (
        <footer className="shrink-0 border-t border-border/60 bg-background">
            <div className="mx-auto w-full max-w-2xl px-4 py-4">
                {step === 'type' && (
                    <div className="flex justify-end">
                        <button
                            type="button"
                            disabled={!canContinueType}
                            onClick={goToPlan}
                            className="min-h-11 rounded-full bg-gradient-brand px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {t('continueToPlan')}
                        </button>
                    </div>
                )}

                {step === 'plan' && (
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={goToType}
                            className="min-h-11 flex-1 rounded-full border border-border text-sm font-semibold text-ink"
                        >
                            {t('actions.back')}
                        </button>
                        <button
                            type="button"
                            disabled={!canContinuePlan}
                            onClick={goToDetails}
                            className="min-h-11 flex-2 rounded-full bg-gradient-brand text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {t('continueToDetails')}
                        </button>
                    </div>
                )}

                {step === 'details' && (
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={goToPlan}
                            className="min-h-11 flex-1 rounded-full border border-border text-sm font-semibold text-ink"
                        >
                            {t('actions.back')}
                        </button>
                        <button
                            form={formId}
                            type="submit"
                            disabled={!canSubmitDetails}
                            className="min-h-11 flex-2 rounded-full bg-gradient-brand text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {t('continueToOverview')}
                        </button>
                    </div>
                )}

                {step === 'overview' && (
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={goToDetails}
                            disabled={isSubmitPending}
                            className="min-h-11 flex-1 rounded-full border border-border text-sm font-semibold text-ink"
                        >
                            {t('actions.back')}
                        </button>
                        <button
                            form={formId}
                            type="submit"
                            disabled={isSubmitPending || !isEmailVerified}
                            className="flex min-h-11 flex-2 items-center justify-center gap-2 rounded-full bg-gradient-brand text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                        >
                            {isSubmitPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : hasDraft ? (
                                t('paidModules.openSetup')
                            ) : (
                                t('submitAndPay')
                            )}
                        </button>
                    </div>
                )}
            </div>
        </footer>
    );
}
