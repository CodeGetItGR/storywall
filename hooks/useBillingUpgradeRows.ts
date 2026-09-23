'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useMemo } from 'react';

import type { BillingUpgradeTarget } from '@/hooks/useEventBillingPanel';
import type { PlanTierResponseDto } from '@/lib/api/types';
import { formatMoney } from '@/lib/billing';
import { formatBytes, formatSignedDelta } from '@/lib/format';
import { buildPlanUpgradeDiff } from '@/lib/planUpgradeDiff';
import { routes } from '@/lib/routes';

export type BillingUpgradeRow = {
    code: string;
    name: string;
    href: string;
    buttonLabel: string;
    // Full upgrade name and price, for screen readers: the visible label drops the plan name.
    buttonAriaLabel: string;
    listPriceLabel: string | null;
    discountLabel: string | null;
    chips: string[];
    addedModuleKeys: string[];
    removedModuleKeys: string[];
};

/**
 * One compact, fully labelled row per upgrade target. Chips show the new limits
 * and how many features the target adds; the module lists stay available for
 * the row's "What changes" disclosure.
 */
export function useBillingUpgradeRows({
    eventId,
    targets,
    currentPlan,
    extraStorageBytes,
}: {
    eventId: string;
    targets: BillingUpgradeTarget[];
    currentPlan: PlanTierResponseDto | null;
    // Storage packs survive an upgrade, so the new limit is the target plan's plus these.
    extraStorageBytes: number;
}): BillingUpgradeRow[] {
    const t = useTranslations('EventPlanSettingsPage');
    const locale = useLocale();

    return useMemo(() => {
        const numberFormat = new Intl.NumberFormat(locale);
        return targets.map(({ option, plan }) => {
            const diff = currentPlan && plan ? buildPlanUpgradeDiff(currentPlan, plan) : null;
            const priceLabel = formatMoney(locale, option.payableAmountMinor, option.currency);

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

            return {
                code: option.planTierCode,
                name: option.planTierName,
                href: routes.events.checkoutReview(eventId, 'upgrade', option.planTierCode),
                buttonLabel: t('upgrade.button', { amount: priceLabel }),
                buttonAriaLabel: t('compare.upgradeButton', { plan: option.planTierName, amount: priceLabel }),
                listPriceLabel:
                    option.gapAmountMinor !== option.payableAmountMinor ? formatMoney(locale, option.gapAmountMinor, option.currency) : null,
                discountLabel: option.discountLabel ?? null,
                chips,
                addedModuleKeys: diff?.addedModuleKeys ?? [],
                removedModuleKeys: diff?.removedModuleKeys ?? [],
            };
        });
    }, [currentPlan, eventId, extraStorageBytes, locale, t, targets]);
}
