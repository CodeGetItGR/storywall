'use client';

import { CalendarPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId } from 'react';

import { AddToCalendarSheet } from '@/components/feed/AddToCalendarSheet';
import { FeedScheduleMore, FeedScheduleName } from '@/components/feed/sections/FeedScheduleEntry';
import { ProgramTimeline } from '@/components/saveMyDate/invitation/sections/info/ProgramTimeline';
import { useAddToCalendar } from '@/hooks/useAddToCalendar';
import type { FeedScheduleDayItems } from '@/hooks/useFeedSchedule';
import { useFeedScheduleRsvp } from '@/hooks/useFeedScheduleRsvp';
import { useModuleCopy } from '@/hooks/useModuleCopy';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

// The dot of the session under way: the app's gradient, over the line's colour.
const NOW_DOT = { background: 'var(--logo)' };

type FeedScheduleTimelineProps = { event: EventDetailResponseDto; heading: string; days: FeedScheduleDayItems[]; className?: string };

// The schedule (KAN-293): Save my date's alternating timeline, in the theme's fonts and the page's text colour. Each
// session has its place under its name, a gradient Now and dot while under way, and its RSVP button when it takes
// replies. Add to calendar sits under the heading, and each day has its heading when there are several.
export function FeedScheduleTimeline({ event, heading, days, className }: FeedScheduleTimelineProps) {
    const t = useTranslations();
    const calendar = useAddToCalendar(event.id, event);
    const rsvp = useFeedScheduleRsvp(event);
    const rsvpName = useModuleCopy(event.eventType)('rsvp').name;
    const idPrefix = useId();
    const nowLabel = t('ManagePage.journey.now');

    return (
        <section className={cn('program-timeline on-page px-4 py-6 text-center text-ink', className)}>
            {/* Heading */}
            <h2 className="text-2xl [font-family:var(--title-font,inherit)]">{heading}</h2>

            {/* Add to calendar */}
            {calendar.available && (
                <>
                    <button
                        type="button"
                        onClick={calendar.openSheet}
                        className="inline-flex min-h-10 items-center gap-1.5 font-sans text-xs font-medium text-ink-muted focus-ring transition-colors hover:text-ink"
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
                <div key={day} className="mt-4">
                    {/* Date */}
                    {label && <h3 className="text-base first-letter:uppercase [font-family:var(--title-font,inherit)]">{label}</h3>}

                    {/* Sessions */}
                    <ProgramTimeline
                        entries={items.map((item) => {
                            const titleId = `${idPrefix}-${item.id}`;
                            const link = item.rsvpEnabled && rsvp ? rsvp(item.id) : null;
                            return {
                                id: item.id,
                                time: item.time,
                                label: <FeedScheduleName item={item} titleId={titleId} nowLabel={nowLabel} />,
                                extra: <FeedScheduleMore item={item} titleId={titleId} rsvp={link} rsvpName={rsvpName} />,
                                className: item.state === 'done' ? 'opacity-50' : undefined,
                                dotStyle: item.state === 'now' ? NOW_DOT : undefined,
                            };
                        })}
                    />
                </div>
            ))}
        </section>
    );
}
