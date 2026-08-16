'use client';

import { CreditCard, Loader2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback } from 'react';

import type { PlanTierResponseDto } from '@/lib/api/types';
import { discountedAmountMinor, formatMoney } from '@/lib/billing';

interface PlanUpgradeButtonProps {
    currentPlan: PlanTierResponseDto;
    isCheckoutPending: boolean;
    isPending: boolean;
    onUpgrade: (planTierCode: string) => void;
    retryIn: number;
    target: PlanTierResponseDto;
}

export function PlanUpgradeButton({ currentPlan, isCheckoutPending, isPending, onUpgrade, retryIn, target }: PlanUpgradeButtonProps) {
    const locale = useLocale();
    const t = useTranslations('EventPlanSettingsPage');
    const listAmount = target.priceAmountMinor! - currentPlan.priceAmountMinor!;
    const amount = discountedAmountMinor(listAmount, target);
    const currency = target.priceCurrency ?? currentPlan.priceCurrency ?? 'EUR';
    const dueLabel = formatMoney(locale, amount, currency);
    const listDueLabel = amount !== listAmount ? formatMoney(locale, listAmount, currency) : null;
    const handleUpgrade = useCallback(() => onUpgrade(target.code), [onUpgrade, target.code]);

    return (
        <button
            type="button"
            onClick={handleUpgrade}
            disabled={isCheckoutPending || retryIn > 0}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-ink px-3 py-2 text-xs font-semibold text-white transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5" />}
            <span className="min-w-0 truncate">
                {retryIn > 0 ? t('actions.retryIn', { seconds: retryIn }) : t('compare.upgradeButton', { plan: target.name, amount: dueLabel })}
            </span>
            {listDueLabel && <span className="shrink-0 text-white/65 line-through">{listDueLabel}</span>}
        </button>
    );
}
