'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { useExtensionOptions } from '@/hooks/useBilling';
import { ERROR_CODES, getErrorCode } from '@/lib/api/errors';
import type { EventStatus } from '@/lib/api/types';
import { canExtendCoverage, formatBillingDate, formatMoney } from '@/lib/billing';
import { routes } from '@/lib/routes';

export type CoverageExtensionRow = {
    id: string;
    monthsLabel: string;
    endsAtLabel: string;
    href: string;
    buttonLabel: string;
    buttonAriaLabel: string;
};

/**
 * The "Extend coverage" section's data. It shows only for the main host of a
 * live event whose coverage has not ended, and only when the plan sells at
 * least one extension. A 5085 from the server means coverage ended since the
 * page loaded: the section then explains that instead of offering a purchase.
 */
export function useCoverageExtensionSection({
    eventId,
    eventStatus,
    coverageEndsAt,
    canPurchase,
}: {
    eventId: string;
    eventStatus: EventStatus | null;
    coverageEndsAt: string | null;
    canPurchase: boolean;
}) {
    const t = useTranslations('EventPlanSettingsPage.extension');
    const locale = useLocale();
    const eligible = canExtendCoverage({ isPrimaryHost: canPurchase, eventStatus, coverageEndsAt });
    const options = useExtensionOptions(eventId, eligible);
    const ended = getErrorCode(options.error) === ERROR_CODES.COVERAGE_ENDED;

    const rows = useMemo<CoverageExtensionRow[]>(
        () =>
            (options.data ?? []).map((option) => {
                const price = formatMoney(locale, option.amountMinor, option.currency);
                return {
                    id: option.coverageOptionId,
                    monthsLabel: t('months', { count: option.months }),
                    endsAtLabel: t('endsAtEstimate', { date: formatBillingDate(locale, option.resultingCoverageEndsAt) ?? '' }),
                    href: routes.events.checkoutReview(eventId, 'extension', { option: option.coverageOptionId }),
                    buttonLabel: t('button', { amount: price }),
                    buttonAriaLabel: t('buttonAria', { count: option.months, amount: price }),
                };
            }),
        [eventId, locale, options.data, t],
    );

    return {
        visible: eligible && (ended || rows.length > 0),
        ended,
        rows,
    };
}
