'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

type CreateEventStep = 'type' | 'plan' | 'addons' | 'details' | 'overview';

export function EventCreateFooter({
    step,
    formId,
    canContinueType,
    canContinue,
    isPending,
    hasDraft,
    payAmountLabel,
    canSubmitDetails,
    onGoToTypeAction,
    onGoToAddonsAction,
    onGoToDetailsAction,
    onGoToPlanAction,
}: {
    step: CreateEventStep;
    formId: string;
    canContinueType: boolean;
    canContinue: boolean;
    isPending: boolean;
    hasDraft: boolean;
    payAmountLabel: string;
    canSubmitDetails: boolean;
    onGoToTypeAction: () => void;
    onGoToAddonsAction: () => void;
    onGoToDetailsAction: () => void;
    onGoToPlanAction: () => void;
}) {
    const t = useTranslations('CreateEventPage');

    return (
        <footer className="shrink-0 border-t border-border/60 bg-background">
            <div className="mx-auto w-full max-w-2xl px-4 py-4">
                {step === 'type' && (
                    <div className="flex justify-end">
                        <button
                            type="button"
                            disabled={!canContinueType}
                            onClick={onGoToPlanAction}
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
                            onClick={onGoToTypeAction}
                            className="min-h-11 flex-1 rounded-full border border-border text-sm font-semibold text-ink"
                        >
                            {t('actions.back')}
                        </button>
                        <button
                            type="button"
                            disabled={!canContinue}
                            onClick={onGoToAddonsAction}
                            className="min-h-11 flex-2 rounded-full bg-gradient-brand text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {t('continueToAddons')}
                        </button>
                    </div>
                )}

                {step === 'addons' && (
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onGoToPlanAction}
                            className="min-h-11 flex-1 rounded-full border border-border text-sm font-semibold text-ink"
                        >
                            {t('actions.back')}
                        </button>
                        <button
                            type="button"
                            onClick={onGoToDetailsAction}
                            className="min-h-11 flex-2 rounded-full bg-gradient-brand text-sm font-semibold text-white transition-opacity hover:opacity-90"
                        >
                            {t('continueToDetails')}
                        </button>
                    </div>
                )}

                {step === 'details' && (
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onGoToAddonsAction}
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
                            onClick={onGoToDetailsAction}
                            disabled={isPending}
                            className="min-h-11 flex-1 rounded-full border border-border text-sm font-semibold text-ink"
                        >
                            {t('actions.back')}
                        </button>
                        <button
                            form={formId}
                            type="submit"
                            disabled={isPending}
                            className="flex min-h-11 flex-2 items-center justify-center gap-2 rounded-full bg-gradient-brand text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                        >
                            {isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : hasDraft ? (
                                t('paidModules.openDraft')
                            ) : (
                                t('submitAndPay', { amount: payAmountLabel })
                            )}
                        </button>
                    </div>
                )}
            </div>
        </footer>
    );
}
