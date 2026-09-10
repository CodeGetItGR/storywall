'use client';

import { useCallback, useMemo, useState } from 'react';

import { useAdminCostCalendar, useAdminCostCalendarDayEvents, useAdminCostSummary, useAdminCostTimeline } from '@/hooks/useAdmin';
import { calendarMonthRange, COST_TRACKING_RANGES, type CostTrackingRange, shiftCalendarMonth, timelineChartData } from '@/lib/costTracking';

const CALENDAR_DAY_PAGE_SIZE = 50;

export function useCostTrackingDashboard() {
    const [range, setRangeState] = useState<CostTrackingRange>('MONTH');
    const [referenceTime] = useState(() => new Date());
    const [calendarMonth, setCalendarMonth] = useState(() => new Date(Date.UTC(referenceTime.getUTCFullYear(), referenceTime.getUTCMonth(), 1)));
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [dayPage, setDayPage] = useState(0);
    const calendarRange = useMemo(() => calendarMonthRange(calendarMonth), [calendarMonth]);
    const weeks = COST_TRACKING_RANGES[range].weeks;
    const summaryQuery = useAdminCostSummary();
    const timelineQuery = useAdminCostTimeline(weeks);
    const calendarQuery = useAdminCostCalendar(calendarRange);
    const dayEventsQuery = useAdminCostCalendarDayEvents({ date: selectedDate, page: dayPage, size: CALENDAR_DAY_PAGE_SIZE });
    const chart = useMemo(() => timelineChartData(timelineQuery.data ?? [], weeks, referenceTime), [referenceTime, timelineQuery.data, weeks]);

    const setRange = useCallback((nextRange: CostTrackingRange) => {
        setRangeState(nextRange);
    }, []);

    const changeCalendarMonth = useCallback((offset: number) => {
        setCalendarMonth((current) => shiftCalendarMonth(current, offset));
        setSelectedDate(null);
        setDayPage(0);
    }, []);

    const openCalendarDay = useCallback((date: string) => {
        setSelectedDate(date);
        setDayPage(0);
    }, []);

    const closeCalendarDay = useCallback(() => setSelectedDate(null), []);

    const refresh = useCallback(() => {
        void Promise.all([summaryQuery.refetch(), timelineQuery.refetch(), calendarQuery.refetch(), dayEventsQuery.refetch()]);
    }, [calendarQuery, dayEventsQuery, summaryQuery, timelineQuery]);

    return {
        chart,
        calendarMonth,
        calendarQuery,
        changeCalendarMonth,
        closeCalendarDay,
        dayEventsQuery,
        dayPage,
        range,
        referenceTime,
        refresh,
        openCalendarDay,
        selectedDate,
        setDayPage,
        setRange,
        summaryQuery,
        timelineQuery,
        weeks,
    };
}
