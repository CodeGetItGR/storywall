'use client';

import { CalendarPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AddToCalendarSheet } from '@/components/feed/AddToCalendarSheet';
import { FeedScheduleRow } from '@/components/feed/sections/FeedScheduleRow';
import { useAddToCalendar } from '@/hooks/useAddToCalendar';
import type { FeedScheduleDayItems } from '@/hooks/useFeedSchedule';
import { useFeedScheduleRsvp } from '@/hooks/useFeedScheduleRsvp';
import { useModuleCopy } from '@/hooks/useModuleCopy';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

type FeedScheduleTimelineProps = { event: EventDetailResponseDto; heading: string; days: FeedScheduleDayItems[]; className?: string };

// The schedule's timeline (look S2): a dotted rail, the time on the left, title and place on the right; a gradient Now
// on the current session, past ones greyed. Add to calendar sits under the heading, and a session that takes RSVPs has
// its button on the right.
export function FeedScheduleTimeline({ event, heading, days, className }: FeedScheduleTimelineProps) {
    const t = useTranslations();
    const calendar = useAddToCalendar(event.id, event);
    const rsvp = useFeedScheduleRsvp(event);
    const rsvpName = useModuleCopy(event.eventType)('rsvp').name;

    return (
        <section className={cn('px-4 py-3 font-sans', className)}>
            {/* Heading */}
            <h2 className="text-sm font-semibold text-ink">{heading}</h2>

            {/* Add to calendar */}
            {calendar.available && (
                <>
                    <button
                        type="button"
                        onClick={calendar.openSheet}
                        className="inline-flex min-h-10 items-center gap-1.5 text-xs font-medium text-ink-muted focus-ring transition-colors hover:text-ink"
                    >
                        <CalendarPlus aria-hidden="true" className="size-4 shrink-0" />
                        {t('FeedPage.addToCalendar')}
                    </button>
                    <AddToCalendarSheet
                        open={calendar.open}
                        onClose={calendar.closeSheet}
                        entries={calendar.entries}
                        selectedIndex={calendar.selectedIndex}
                        onSelectEntry={calendar.selectEntry}
                        links={calendar.links}
                    />
                </>
            )}

            {/* Days */}
            {days.map(({ day, label, items }) => (
                <div key={day}>
                    {/* Date */}
                    {label && <h3 className="mt-4 text-sm font-medium text-ink first-letter:uppercase">{label}</h3>}

                    {/* Sessions */}
                    <ol className="mt-2 flex flex-col gap-4">
                        {items.map((item) => (
                            <FeedScheduleRow
                                key={item.id}
                                item={item}
                                nowLabel={t('ManagePage.journey.now')}
                                rsvp={item.rsvpEnabled && rsvp ? rsvp(item.id) : null}
                                rsvpName={rsvpName}
                            />
                        ))}
                    </ol>
                </div>
            ))}
        </section>
    );
}
