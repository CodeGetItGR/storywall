'use client';

import { CreditCard, Loader2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback } from 'react';

import type { CoverageSummaryDto, PlanTierResponseDto } from '@/lib/api/types';
import { discountedAmountMinor, formatBillingDate, formatMoney } from '@/lib/billing';

interface PlanUpgradeActionsProps {
    checkoutError: string | null;
    coverage: CoverageSummaryDto | null;
    currentPlan: PlanTierResponseDto;
    isCheckoutPending: boolean;
    onUpgrade: (planTierCode: string) => void;
    pendingPlanCode: string | null;
    retryIn: number;
    targets: PlanTierResponseDto[];
}

export function PlanUpgradeActions({
    checkoutError,
    coverage,
    currentPlan,
    isCheckoutPending,
    onUpgrade,
    pendingPlanCode,
    retryIn,
    targets,
}: PlanUpgradeActionsProps) {
    const locale = useLocale();
    const t = useTranslations('EventPlanSettingsPage');
    const coveredUntil = formatBillingDate(locale, coverage?.paidThrough ?? null);

    if (targets.length === 0) return null;

    return (
        <section className="mt-6 border-y border-border py-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-[11px] font-semibold tracking-wide text-ink-faint uppercase">{t('compare.upgradeOptions')}</p>
                    <h2 className="text-base font-bold text-ink">{t('compare.upgradeOptionsTitle', { plan: currentPlan.name })}</h2>
                </div>
                <p className="max-w-xl text-xs leading-5 text-ink-muted">
                    {coverage?.unlimited
                        ? t('compare.upgradeCoverageUnlimited')
                        : coveredUntil
                          ? t('compare.upgradeCoverageThrough', { date: coveredUntil })
                          : t('compare.upgradeCoverageUnchanged')}
                </p>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {targets.map((target) => (
                    <UpgradeTargetButton
                        key={target.id}
                        currentPlan={currentPlan}
                        isCheckoutPending={isCheckoutPending}
                        isPending={isCheckoutPending && pendingPlanCode === target.code}
                        onUpgrade={onUpgrade}
                        retryIn={retryIn}
                        target={target}
                    />
                ))}
            </div>

            {checkoutError && <p className="mt-3 text-xs text-rose-600">{checkoutError}</p>}
        </section>
    );
}

function UpgradeTargetButton({
    currentPlan,
    isCheckoutPending,
    isPending,
    onUpgrade,
    retryIn,
    target,
}: {
    currentPlan: PlanTierResponseDto;
    isCheckoutPending: boolean;
    isPending: boolean;
    onUpgrade: (planTierCode: string) => void;
    retryIn: number;
    target: PlanTierResponseDto;
}) {
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
            className="flex min-h-24 flex-col items-start justify-between rounded-lg border border-border bg-card p-3 text-left transition hover:border-primary/40 hover:bg-primary-light/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
            <span className="flex w-full items-center justify-between gap-2">
                <span className="min-w-0 text-sm font-bold text-ink">{t('actions.upgradeTo', { plan: target.name })}</span>
                {isPending ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : <CreditCard className="h-4 w-4 shrink-0 text-primary-dark" />}
            </span>
            <span className="mt-3 text-sm font-semibold text-ink">
                {retryIn > 0 ? t('actions.retryIn', { seconds: retryIn }) : t('compare.upgradeDueNow', { amount: dueLabel })}
            </span>
            {listDueLabel && (
                <span className="mt-1 text-xs font-semibold text-ink-faint">
                    <span className="line-through">{listDueLabel}</span>
                    {target.discountLabel && <span className="ml-1">{target.discountLabel}</span>}
                </span>
            )}
        </button>
    );
}
