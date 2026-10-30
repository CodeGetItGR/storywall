'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { EMPTY_VALUE, formatRate } from '@/lib/adminFunnel';
import { formatOutreachDay, outreachCityKey } from '@/lib/adminOutreach';
import { formatDate } from '@/lib/datetime';
import { numberFormat } from '@/lib/format';

// Locale-aware formatters for the outreach section. A missing value reads as "—".
export function useOutreachFormat() {
    const locale = useLocale();
    const cityNames = useTranslations('AdminPage.outreach.cityNames');

    return useMemo(
        () => ({
            count: (value: number) => numberFormat(locale).format(value),
            rate: (ratio: number | null) => formatRate(locale, ratio),
            day: (value: string | null) => formatOutreachDay(locale, value) ?? EMPTY_VALUE,
            dateTime: (value: string) => formatDate(locale, value, { dateStyle: 'medium', timeStyle: 'short' }),
            city: (value: string) => {
                const key = outreachCityKey(value);
                return key ? cityNames(key) : value;
            },
        }),
        [locale, cityNames],
    );
}
