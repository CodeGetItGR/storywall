'use client';

import { useLocale, useTranslations } from 'next-intl';

import type { PaidServiceResponseDto } from '@/lib/api/types';
import { formatMoney } from '@/lib/billing';

// One feature add-on: its catalogue name and its one-time price.
// nameId lets a row's button say which add-on it changes.
export function FeatureAddonLabel({ service, nameId }: { service: PaidServiceResponseDto; nameId?: string }) {
    const t = useTranslations('EventAddonsSettingsPage.features');
    const locale = useLocale();

    return (
        <span className="flex min-w-0 flex-1 items-center gap-3">
            <span id={nameId} className="min-w-0 flex-1 text-sm font-semibold text-ink">
                {service.name}
            </span>
            <span className="shrink-0 text-sm text-ink-muted tabular-nums">
                {t('price', { price: formatMoney(locale, service.priceAmountMinor, service.priceCurrency) })}
            </span>
        </span>
    );
}
