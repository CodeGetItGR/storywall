'use client';

import { CreditCard, Loader2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback } from 'react';

import type { UpgradeOptionResponseDto } from '@/lib/api/types';
import { formatMoney } from '@/lib/billing';

interface PlanUpgradeButtonProps {
    option: UpgradeOptionResponseDto;
    isCheckoutPending: boolean;
    isPending: boolean;
    onUpgrade: (planTierCode: string) => void;
    retryIn: number;
}

export function PlanUpgradeButton({ option, isCheckoutPending, isPending, onUpgrade, retryIn }: PlanUpgradeButtonProps) {
    const locale = useLocale();
    const t = useTranslations('EventPlanSettingsPage');
    const dueLabel = formatMoney(locale, option.payableAmountMinor, option.currency);
    const listDueLabel = option.payableAmountMinor !== option.gapAmountMinor ? formatMoney(locale, option.gapAmountMinor, option.currency) : null;
    const handleUpgrade = useCallback(() => onUpgrade(option.planTierCode), [onUpgrade, option.planTierCode]);

    return (
        <button
            type="button"
            onClick={handleUpgrade}
            disabled={isCheckoutPending || retryIn > 0}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-ink px-3 py-2 text-xs font-semibold text-white transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5" />}
            <span className="min-w-0 truncate">
                {retryIn > 0 ? t('actions.retryIn', { seconds: retryIn }) : t('compare.upgradeButton', { plan: option.planTierName, amount: dueLabel })}
            </span>
            {listDueLabel && <span className="shrink-0 text-white/65 line-through">{listDueLabel}</span>}
        </button>
    );
}
