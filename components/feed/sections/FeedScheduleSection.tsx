'use client';

import { CalendarPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { AddToCalendarSheet } from '@/components/feed/AddToCalendarSheet';
import { FeedScheduleRsvp } from '@/components/feed/sections/FeedScheduleRsvp';
import { useAddToCalendar } from '@/hooks/useAddToCalendar';
import { type FeedScheduleItem, useFeedSchedule } from '@/hooks/useFeedSchedule';
import { type FeedScheduleRsvpLink, useFeedScheduleRsvp } from '@/hooks/useFeedScheduleRsvp';
import { useModuleCopy } from '@/hooks/useModuleCopy';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

// Today's schedule (look S2): a dotted rail, the time on the left, title and place on the right; a gradient Now on
// the current session, past ones greyed. Add to calendar sits under the heading, and a session that takes RSVPs has its
// button on the right.
export function FeedScheduleSection({ event, placeholder = null }: { event: EventDetailResponseDto; placeholder?: ReactNode }) {
    const t = useTranslations();
    const items = useFeedSchedule(event);
    const calendar = useAddToCalendar(event.id, event);
    const rsvp = useFeedScheduleRsvp(event);
    const rsvpName = useModuleCopy(event.eventType)('rsvp').name;
    if (!items) return placeholder;

    return (
        <section className="px-4 py-3 font-sans">
            {/* Heading */}
            <h2 className="text-sm font-semibold text-ink">{t('InvitationEditor.sectionNames.feedSchedule')}</h2>

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

            {/* Sessions */}
            <ol className="mt-2 flex flex-col gap-4">
                {items.map((item) => (
                    <ScheduleRow
                        key={item.id}
                        item={item}
                        nowLabel={t('ManagePage.journey.now')}
                        rsvp={item.rsvpEnabled && rsvp ? rsvp(item.id) : null}
                        rsvpName={rsvpName}
                    />
                ))}
            </ol>
        </section>
    );
}

// The dotted rail runs from each row's dot to the next one's.
const RAIL =
    'not-last:before:absolute not-last:before:top-5 not-last:before:-bottom-5 not-last:before:left-[3.75rem] not-last:before:-translate-x-px not-last:before:border-l-2 not-last:before:border-dotted not-last:before:border-ink/20';

type ScheduleRowProps = { item: FeedScheduleItem; nowLabel: string; rsvp: FeedScheduleRsvpLink | null; rsvpName: string };

function ScheduleRow({ item, nowLabel, rsvp, rsvpName }: ScheduleRowProps) {
    const titleId = `feed-schedule-${item.id}`;
    const isNow = item.state === 'now';
    // Greyed on its own parts, so the rail keeps one colour down the list.
    const past = item.state === 'done' && 'opacity-50';

    return (
        <li data-state={item.state} className={cn('relative grid grid-cols-[3rem_1.5rem_1fr_auto] items-start', RAIL)}>
            {/* Time */}
            <span className={cn('pt-px text-sm text-ink-muted tabular-nums', past)}>{item.time}</span>

            {/* Rail */}
            <span
                aria-hidden="true"
                className={cn('mt-1.5 size-2.5 justify-self-center rounded-full', isNow ? 'bg-(image:--logo)' : 'bg-ink/30', past)}
            />

            {/* Session */}
            <span className={cn('flex min-w-0 flex-col', past)}>
                <span className="flex items-start gap-2 text-sm font-medium text-ink">
                    <span id={titleId} className="min-w-0 wrap-break-word">
                        {item.title}
                    </span>
                    {isNow && (
                        <span className="shrink-0 rounded-full bg-(image:--logo) px-2 py-0.5 text-[11px] font-semibold text-white">{nowLabel}</span>
                    )}
                </span>
                {item.place && <span className="text-xs wrap-break-word text-ink-muted">{item.place}</span>}
            </span>

            {/* RSVP */}
            {rsvp && <FeedScheduleRsvp {...rsvp} label={rsvpName} describedBy={titleId} />}
        </li>
    );
}
