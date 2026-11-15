'use client';

import { EventActivityDaily } from '@/components/admin/events/activity/EventActivityDaily';
import { EventActivityDayPicker } from '@/components/admin/events/activity/EventActivityDayPicker';
import { EventActivityEmpty } from '@/components/admin/events/activity/EventActivityEmpty';
import { EventActivityHeatmap } from '@/components/admin/events/activity/EventActivityHeatmap';
import { EventActivityHourly } from '@/components/admin/events/activity/EventActivityHourly';
import { EventActivityMembers } from '@/components/admin/events/activity/EventActivityMembers';
import { EventActivityPeaks } from '@/components/admin/events/activity/EventActivityPeaks';
import { EventActivityTiles } from '@/components/admin/events/activity/EventActivityTiles';
import { useEventActivityView } from '@/hooks/useEventActivityView';
import type { AdminEventActivityDto } from '@/lib/api/types';

// The Activity tab's body, from one response. Sections are separated by space, not borders.
export function EventActivityContent({ activity }: { activity: AdminEventActivityDto }) {
    const view = useEventActivityView(activity);

    return (
        <div className="space-y-9">
            {/* Summary */}
            <div className="space-y-4">
                <EventActivityMembers members={activity.members} />
                <EventActivityTiles totals={activity.totals} removed={activity.removed} />
            </div>

            {!view.hasActivity || !view.day ? (
                // Empty
                <EventActivityEmpty />
            ) : (
                <>
                    {/* Per hour */}
                    <EventActivityHourly
                        columns={view.hourly}
                        kinds={view.kinds}
                        picker={
                            <EventActivityDayPicker
                                day={view.day}
                                canGoBack={Boolean(view.previousDay)}
                                canGoForward={Boolean(view.nextDay)}
                                onPreviousAction={view.goToPreviousDay}
                                onNextAction={view.goToNextDay}
                            />
                        }
                    />
                    {/* Busiest hours and peaks */}
                    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                        <EventActivityHeatmap heatmap={view.heatmap} kinds={view.kinds} />
                        <EventActivityPeaks peaks={view.peaks} />
                    </div>
                    {/* Per day */}
                    <EventActivityDaily columns={view.daily} kinds={view.kinds} />
                </>
            )}
        </div>
    );
}
