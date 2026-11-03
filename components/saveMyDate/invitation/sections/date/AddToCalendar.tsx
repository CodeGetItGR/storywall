'use client';

import { useInvitationCalendar } from '@/hooks/useInvitationCalendar';
import type { InvitationLabels } from '@/lib/invitation/labels';

const ICONS = '/save-my-date/calendar-icons';

type AddToCalendarProps = { iso: string; labels: InvitationLabels };

// Google, Outlook, Yahoo and Apple calendar buttons under the date.
export function AddToCalendar({ iso, labels }: AddToCalendarProps) {
    const { links, downloadIcs } = useInvitationCalendar(iso, labels.calendarEventTitle);

    return (
        <div className="date-cal-row">
            <div className="date-cal-divider" />
            {/* Calendars */}
            <div className="date-cal-icons">
                <CalendarLink href={links?.google} label={labels.googleCalendar} icon="google" />
                <CalendarLink href={links?.outlook} label={labels.outlookCalendar} icon="outlook" />
                <CalendarLink href={links?.yahoo} label={labels.yahooCalendar} icon="yahoo" />
                <button type="button" onClick={downloadIcs} title={labels.appleCalendar} aria-label={labels.appleCalendar}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`${ICONS}/apple.png`} alt={labels.appleCalendar} />
                </button>
            </div>
            <div className="date-cal-label">{labels.addToCalendar}</div>
        </div>
    );
}

type CalendarLinkProps = { href: string | undefined; label: string; icon: string };

function CalendarLink({ href, label, icon }: CalendarLinkProps) {
    return (
        <a href={href ?? '#'} target="_blank" rel="noopener" title={label} aria-label={label}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${ICONS}/${icon}.png`} alt={label} />
        </a>
    );
}
