'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { useFunnelFormat } from '@/hooks/useFunnelFormat';
import type { Change } from '@/lib/campaignCompare';
import { dateTimeFormat, numberFormat } from '@/lib/format';

const SHORT_DATE: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
// A chart day (YYYY-MM-DD) is a calendar date, not an instant: read and shown in UTC so it never shifts.
const CHART_DAY: Intl.DateTimeFormatOptions = { ...SHORT_DATE, timeZone: 'UTC' };

// A range's end is the first moment after it; the last day shown is the one before.
function lastDay(until: string): Date {
    return new Date(Date.parse(until) - 1);
}

// The Campaigns page's formatters: the funnel ones, plus dates, periods and changes.
export function useCampaignFormat() {
    const locale = useLocale();
    const t = useTranslations('AdminPage.campaigns');
    const funnel = useFunnelFormat();

    return useMemo(() => {
        const shortDate = (iso: string) => dateTimeFormat(locale, SHORT_DATE).format(new Date(iso));
        // A range from the backend, whose end is exclusive: "1–30 Oct".
        const period = (since: string, until: string) => dateTimeFormat(locale, SHORT_DATE).formatRange(new Date(since), lastDay(until));
        // A discount's start and end, both included: "3–30 Nov".
        const dates = (start: string, end: string) => dateTimeFormat(locale, SHORT_DATE).formatRange(new Date(start), new Date(end));
        const day = (date: string) => dateTimeFormat(locale, CHART_DAY).format(new Date(`${date}T00:00:00Z`));
        // "12%", "2", or "€30" for money; nothing for "same".
        const changeValue = (change: Change, currency?: string) => {
            if (change.kind === 'same') return '';
            if (change.kind === 'percent') return funnel.rate(change.ratio);
            return currency ? funnel.money(change.amount, currency) : funnel.count(change.amount);
        };
        // The words a screen reader hears and the hover shows.
        const changeWords = (change: Change, compared: string | null, currency?: string) => {
            const value = changeValue(change, currency);
            const words = change.kind === 'same' ? t('change.same') : t(`change.${change.direction}`, { value });
            return compared ? `${words}. ${t('change.compared', { period: compared })}` : words;
        };
        const percent = (value: number) => numberFormat(locale, { maximumFractionDigits: 2 }).format(value);

        return { ...funnel, shortDate, period, dates, day, changeValue, changeWords, percent };
    }, [funnel, locale, t]);
}
