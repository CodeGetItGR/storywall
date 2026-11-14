'use client';

import { useMemo, useState } from 'react';

import { activeDays, dailySeries, defaultDay, hourlyForDay, hourOfDayHeatmap, shiftDay, topPeaks } from '@/lib/adminEventActivity';
import type { AdminEventActivityDto } from '@/lib/api/types';

// Everything the Activity tab draws, derived once from the response, plus the day picker.
export function useEventActivityView(activity: AdminEventActivityDto) {
    const days = useMemo(() => activeDays(activity.hours), [activity.hours]);
    const initialDay = useMemo(
        () => defaultDay(activity.hours, activity.eventStartAt, activity.timezone),
        [activity.hours, activity.eventStartAt, activity.timezone],
    );
    const [pickedDay, setPickedDay] = useState<string | null>(null);
    // A refresh can drop the picked day; fall back to the default rather than show an empty chart.
    const day = pickedDay && days.includes(pickedDay) ? pickedDay : initialDay;

    const previousDay = day ? shiftDay(days, day, -1) : null;
    const nextDay = day ? shiftDay(days, day, 1) : null;

    return {
        day,
        hourly: useMemo(() => (day ? hourlyForDay(activity.hours, day) : []), [activity.hours, day]),
        daily: useMemo(() => dailySeries(activity.hours), [activity.hours]),
        heatmap: useMemo(() => hourOfDayHeatmap(activity.hours), [activity.hours]),
        peaks: useMemo(() => topPeaks(activity.hours), [activity.hours]),
        hasActivity: activity.hours.length > 0,
        previousDay,
        nextDay,
        goToPreviousDay: () => previousDay && setPickedDay(previousDay),
        goToNextDay: () => nextDay && setPickedDay(nextDay),
    };
}
