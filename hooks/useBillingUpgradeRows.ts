'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useMemo } from 'react';

import type { BillingUpgradeTarget } from '@/hooks/useEventBillingPanel';
import type { PlanTierResponseDto } from '@/lib/api/types';
import { formatMoney } from '@/lib/billing';
import { formatBytes, formatSignedDelta } from '@/lib/format';
import { buildPlanUpgradeDiff } from '@/lib/planUpgradeDiff';
import { routes } from '@/lib/routes';
import { pickedUpgradeDuration, upgradeDurations } from '@/lib/upgradeOptions';

export type BillingUpgradeRow = {
    code: string;
    name: string;
    // The durations this plan can be upgraded to, shortest first, and the one picked.
    durations: { id: string; months: number }[];
    durationId: string;
    // How much later coverage ends with the picked duration; 0 for none.
    monthsAdded: number;
    href: string;
    buttonLabel: string;
    // Full upgrade name, duration and price, for screen readers: the visible label drops them.
    buttonAriaLabel: string;
    listPriceLabel: string | null;
    discountLabel: string | null;
    chips: string[];
    addedModuleKeys: string[];
    removedModuleKeys: string[];
};

/**
 * One compact, fully labelled row per upgrade target, priced at the duration
 * picked on it (the shortest until one is). Chips show the new limits and how
 * many features the target adds; the module lists stay available for the row's
 * "What changes" disclosure.
 */
export function useBillingUpgradeRows({
    eventId,
    targets,
    currentPlan,
    extraStorageBytes,
    picks,
}: {
    eventId: string;
    targets: BillingUpgradeTarget[];
    currentPlan: PlanTierResponseDto | null;
    // Storage packs survive an upgrade, so the new limit is the target plan's plus these.
    extraStorageBytes: number;
    // The duration picked on each row, keyed by plan code.
    picks: Record<string, string>;
}): BillingUpgradeRow[] {
    const t = useTranslations('EventPlanSettingsPage');
    const tDurations = useTranslations('Durations');
    const locale = useLocale();

    return useMemo(() => {
        const numberFormat = new Intl.NumberFormat(locale);
        return targets.flatMap(({ entry, plan }) => {
            const duration = pickedUpgradeDuration(entry, picks[entry.planTierCode]);
            if (!duration) return [];

            const diff = currentPlan && plan ? buildPlanUpgradeDiff(currentPlan, plan) : null;
            const priceLabel = formatMoney(locale, duration.payableAmountMinor, entry.currency);

            const chips = (diff?.limitChanges ?? []).map((change) => {
                // No difference against an unlimited side: there is nothing to subtract.
                const delta = change.current !== null && change.target !== null ? change.target - change.current : null;
                if (change.key === 'storage') {
                    if (change.target === null) return t('upgrade.storageUnlimited');
                    const label = t('upgrade.storage', { value: formatBytes(change.target + extraStorageBytes) });
                    return delta === null ? label : t('upgrade.withDelta', { value: label, delta: formatSignedDelta(delta, formatBytes) });
                }
                if (change.target === null) return t('upgrade.membersUnlimited');
                const label = t('upgrade.members', { count: change.target });
                return delta === null ? label : t('upgrade.withDelta', { value: label, delta: formatSignedDelta(delta, numberFormat.format) });
            });
            if (diff && diff.addedModuleKeys.length > 0) chips.push(t('upgrade.features', { count: diff.addedModuleKeys.length }));

            return [
                {
                    code: entry.planTierCode,
                    name: entry.planTierName,
                    durations: upgradeDurations(entry).map((option) => ({ id: option.coverageOptionId, months: option.months })),
                    durationId: duration.coverageOptionId,
                    monthsAdded: duration.monthsAdded,
                    href: routes.events.checkoutReview(eventId, 'upgrade', { code: entry.planTierCode, option: duration.coverageOptionId }),
                    buttonLabel: t('upgrade.button', { amount: priceLabel }),
                    buttonAriaLabel: t('upgrade.buttonAria', {
                        plan: entry.planTierName,
                        duration: tDurations('months', { count: duration.months }),
                        amount: priceLabel,
                    }),
                    listPriceLabel:
                        duration.gapAmountMinor !== duration.payableAmountMinor ? formatMoney(locale, duration.gapAmountMinor, entry.currency) : null,
                    discountLabel: entry.discountLabel ?? null,
                    chips,
                    addedModuleKeys: diff?.addedModuleKeys ?? [],
                    removedModuleKeys: diff?.removedModuleKeys ?? [],
                },
            ];
        });
    }, [currentPlan, eventId, extraStorageBytes, locale, picks, t, tDurations, targets]);
}
