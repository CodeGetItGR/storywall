'use client';

import { useLocale, useTranslations } from 'next-intl';
import { type ReactNode, useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';

import { FunnelGroup } from '@/components/admin/funnel/FunnelGroup';
import { FunnelSegmented } from '@/components/admin/funnel/FunnelSegmented';
import { LoadingState } from '@/components/ui/LoadingState';
import type { useFunnelCohorts } from '@/hooks/useFunnelCohorts';
import { useFunnelFormat } from '@/hooks/useFunnelFormat';
import { COHORT_SERIES, EMPTY_VALUE, FUNNEL_COHORT_WEEKS, type FunnelCohortMode } from '@/lib/adminFunnel';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import { formatDate } from '@/lib/datetime';

const SERIES_COLORS = ['#ccd1db', '#9aa0b1', '#7b8394', '#3f4453', '#1a7f5a'];

export function FunnelCohorts({ cohorts }: { cohorts: ReturnType<typeof useFunnelCohorts> }) {
    const t = useTranslations('AdminPage.funnel');
    const tAdmin = useTranslations('AdminPage');
    const locale = useLocale();
    const format = useFunnelFormat();
    const isPercent = cohorts.mode === 'PERCENT';

    const weekOptions = useMemo(() => FUNNEL_COHORT_WEEKS.map((weeks) => ({ value: weeks, label: t('cohorts.weeks', { count: weeks }) })), [t]);
    const modeOptions = useMemo<{ value: FunnelCohortMode; label: string }[]>(
        () => [
            { value: 'COUNT', label: t('cohorts.count') },
            { value: 'PERCENT', label: t('cohorts.percent') },
        ],
        [t],
    );

    function formatWeek(value: string) {
        return formatDate(locale, value, { day: 'numeric', month: 'short', timeZone: 'UTC' });
    }

    function formatWeekWithYear(value: ReactNode) {
        return t('cohorts.weekOf', { date: formatDate(locale, String(value), { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) });
    }

    function formatValue(value: number) {
        return isPercent ? format.rate(value) : format.count(value);
    }

    function formatTooltip(value: ValueType | undefined, name: NameType | undefined) {
        const number = typeof value === 'number' ? value : null;
        return [number === null ? EMPTY_VALUE : formatValue(number), String(name ?? '')];
    }

    return (
        <FunnelGroup title={t('cohorts.title')} window="none" note={t('cohorts.note')}>
            {/* Controls */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
                <FunnelSegmented label={t('cohorts.weeksLabel')} options={weekOptions} value={cohorts.weeks} onChangeAction={cohorts.setWeeks} />
                <FunnelSegmented label={t('cohorts.modeLabel')} options={modeOptions} value={cohorts.mode} onChangeAction={cohorts.setMode} />
            </div>

            {/* Chart */}
            {cohorts.isLoading && <LoadingState label={t('cohorts.loading')} className="justify-start" />}
            {Boolean(cohorts.error) && <p className="text-sm text-status-danger">{tAdmin(`errors.${adminErrorMessageKey(cohorts.error)}`)}</p>}
            {cohorts.rows && cohorts.rows.length === 0 && <p className="text-sm text-ink-muted">{t('cohorts.empty')}</p>}
            {cohorts.rows && cohorts.rows.length > 0 && (
                <div className="h-72 min-w-0" aria-label={t('cohorts.title')}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={cohorts.rows} margin={{ top: 4, right: 8, left: -12, bottom: 0 }} barCategoryGap="15%">
                            <CartesianGrid stroke="var(--border)" vertical={false} />
                            <XAxis dataKey="weekStart" tickFormatter={formatWeek} tick={{ fill: 'var(--ink-faint)', fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={12} />
                            <YAxis
                                allowDecimals={isPercent}
                                domain={isPercent ? [0, 1] : [0, 'auto']}
                                tickFormatter={formatValue}
                                tick={{ fill: 'var(--ink-faint)', fontSize: 11 }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip formatter={formatTooltip} labelFormatter={formatWeekWithYear} />
                            <Legend wrapperStyle={{ fontSize: 12 }} itemSorter={null} />
                            {COHORT_SERIES.map((series, index) => (
                                <Bar key={series} dataKey={series} name={t(`steps.${series}`)} fill={SERIES_COLORS[index]} />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </FunnelGroup>
    );
}
