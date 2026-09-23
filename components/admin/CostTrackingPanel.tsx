'use client';

import { RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AdminSection } from '@/components/admin/AdminSection';
import { CostTrackingCalendar } from '@/components/admin/CostTrackingCalendar';
import { CostTrackingDayDrawer } from '@/components/admin/CostTrackingDayDrawer';
import { CostTrackingProviders } from '@/components/admin/CostTrackingProviders';
import { CostTrackingRangeControl } from '@/components/admin/CostTrackingRangeControl';
import { CostTrackingTrends } from '@/components/admin/CostTrackingTrends';
import { LoadingState } from '@/components/ui/LoadingState';
import { useCostTrackingDashboard } from '@/hooks/useCostTrackingDashboard';
import { adminErrorMessageKey } from '@/lib/adminUtils';

export function CostTrackingPanel() {
    const t = useTranslations('AdminPage');
    const state = useCostTrackingDashboard();
    const isRefreshing =
        state.summaryQuery.isFetching || state.timelineQuery.isFetching || state.calendarQuery.isFetching || state.dayEventsQuery.isFetching;
    const error = state.summaryQuery.error ?? state.timelineQuery.error;
    const selectedDate = state.selectedDate;
    const selectedDay = selectedDate ? state.calendarQuery.data?.days.find((day) => day.date.startsWith(selectedDate)) : undefined;

    return (
        <section className="space-y-5">
            {/* Page header and range controls */}
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-dark">{t('costTracking.eyebrow')}</p>
                    <h2 className="mt-1 text-xl font-semibold tracking-tight text-ink">{t('costTracking.title')}</h2>
                    <p className="mt-2 max-w-2xl text-base leading-7 text-ink-muted">{t('costTracking.subtitle')}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <CostTrackingRangeControl range={state.range} onChangeAction={state.setRange} />
                    <button
                        type="button"
                        onClick={state.refresh}
                        disabled={isRefreshing}
                        className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border bg-card px-4 text-sm font-semibold text-ink-muted transition hover:border-ink-faint hover:bg-surface-muted disabled:opacity-50"
                    >
                        <RefreshCw className={isRefreshing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
                        {t('costTracking.refresh')}
                    </button>
                </div>
            </div>

            {error && <p className="text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(error)}`)}</p>}

            {/* Provider snapshots */}
            {state.summaryQuery.isLoading ? <LoadingState label={t('costTracking.loading')} className="justify-start" /> : null}
            {state.summaryQuery.data && <CostTrackingProviders summary={state.summaryQuery.data} />}

            {/* Volume trends */}
            {state.timelineQuery.isLoading ? (
                <LoadingState label={t('costTracking.trends.loading')} className="justify-start" />
            ) : state.timelineQuery.data ? (
                <CostTrackingTrends data={state.chart.data} planTiers={state.chart.planTiers} />
            ) : null}

            {/* Event calendar */}
            <AdminSection title={t('costTracking.calendar.title')} description={t('costTracking.calendar.description')}>
                <CostTrackingCalendar
                    calendar={state.calendarQuery.data}
                    error={state.calendarQuery.error}
                    isLoading={state.calendarQuery.isLoading}
                    month={state.calendarMonth}
                    onChangeMonthAction={state.changeCalendarMonth}
                    onOpenDayAction={state.openCalendarDay}
                />
            </AdminSection>

            {/* Selected day details */}
            <CostTrackingDayDrawer
                day={selectedDay}
                error={state.dayEventsQuery.error}
                events={state.dayEventsQuery.data}
                isLoading={state.dayEventsQuery.isLoading}
                onCloseAction={state.closeCalendarDay}
                onPageChangeAction={state.setDayPage}
                open={Boolean(state.selectedDate)}
                page={state.dayPage}
            />
        </section>
    );
}
