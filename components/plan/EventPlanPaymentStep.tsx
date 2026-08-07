'use client';

import { CreditCard } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { PlanTierResponseDto } from '@/lib/api/types';
import { formatPlanMoney } from '@/lib/planTiers';

type EventPlanPaymentStepProps = {
    plan: PlanTierResponseDto | undefined;
    selectedCode: string;
    onBack: () => void;
    onContinue: () => void;
};

export function EventPlanPaymentStep({ plan, selectedCode, onBack, onContinue }: EventPlanPaymentStepProps) {
    const t = useTranslations('CreateEventPage');
    const price = plan ? formatPlanMoney(plan) : null;

    return (
        <div className="space-y-4">
            <div className="rounded-xl border border-border bg-white p-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-light text-primary-dark">
                        <CreditCard className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="font-semibold text-ink">{plan?.name ?? selectedCode}</p>
                        <p className="text-sm text-ink-muted">{price ?? t('payment.noCharge')}</p>
                    </div>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-ink-muted">{t('payment.placeholder')}</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
                <button
                    type="button"
                    onClick={onBack}
                    className="flex-1 rounded-full bg-surface-muted px-4 py-3 text-sm font-semibold text-ink-muted"
                >
                    {t('backToPlans')}
                </button>
                <button
                    type="button"
                    onClick={onContinue}
                    className="flex-1 rounded-full bg-gradient-brand px-4 py-3 text-sm font-semibold text-white"
                >
                    {t('payment.continue')}
                </button>
            </div>
        </div>
    );
}
