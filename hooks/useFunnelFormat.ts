'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { EMPTY_VALUE, formatMedian, formatMinorMoney, formatRate, toHoursDisplay } from '@/lib/adminFunnel';

// Locale-aware formatters for the Growth dashboard. Every "no value" reads as "—".
export function useFunnelFormat() {
    const locale = useLocale();
    const t = useTranslations('AdminPage.funnel');

    return useMemo(
        () => ({
            count: (value: number) => new Intl.NumberFormat(locale).format(value),
            rate: (ratio: number | null) => formatRate(locale, ratio),
            hours: (hours: number | null) => {
                const display = toHoursDisplay(locale, hours);
                return display ? t(display.unit, { value: display.value }) : EMPTY_VALUE;
            },
            median: (value: number | null) => formatMedian(locale, value),
            money: (minor: number, currency: string) => formatMinorMoney(locale, minor, currency),
        }),
        [locale, t],
    );
}
