'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useMemo } from 'react';

import { type CampaignChartLine, campaignVisitorsChart, hourLabel, showsHourly } from '@/lib/adminCampaignOverview';
import type { CampaignOverviewDto } from '@/lib/api/types';
import { formatDate } from '@/lib/datetime';

// Categorical slots, validated as a set on the light card (adjacent CVD ΔE ≥ 9). "Other" and the single
// total line stay neutral so they never read as one more source.
const SLOT_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'];
const NEUTRAL = 'var(--ink-muted)';

// The visitors chart: per hour for a one-day range, otherwise per day, with a named, colored line each.
export function useCampaignVisitorsChart(data: CampaignOverviewDto) {
    const t = useTranslations('AdminPage.campaignOverview.chart');
    const locale = useLocale();
    const hourly = showsHourly(data);
    const chart = useMemo(() => campaignVisitorsChart(data, hourly), [data, hourly]);

    const lineName = useCallback((line: CampaignChartLine) => (line.other ? t('other') : (line.series ?? t('visitors'))), [t]);
    const lineColor = useCallback((line: CampaignChartLine) => (line.slot < 0 || line.series === null ? NEUTRAL : SLOT_COLORS[line.slot]), []);

    const formatX = useCallback(
        (value: unknown) => (hourly ? hourLabel(value) : formatDate(locale, String(value), { day: 'numeric', month: 'short', timeZone: 'UTC' })),
        [hourly, locale],
    );

    return {
        title: hourly ? t('hourly') : t('daily'),
        lines: chart.lines,
        rows: chart.rows,
        // One line is named by the title; two or more get a legend.
        showLegend: chart.lines.length > 1,
        lineName,
        lineColor,
        formatX,
    };
}
