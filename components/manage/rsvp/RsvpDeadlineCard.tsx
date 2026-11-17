'use client';

import { CalendarClock, Pencil } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';

import { RsvpDeadlineSheet } from '@/components/manage/rsvp/RsvpDeadlineSheet';
import { formatDate } from '@/lib/datetime';
import { rsvpCountdown } from '@/lib/rsvpReport';

type RsvpDeadlineCardProps = {
    eventId: string;
    rsvpDeadline: string | null;
    startAt: string;
    // The pencil shows only while the event can still be changed.
    canWrite: boolean;
};

// R1a: the countdown to the RSVP deadline (or the event), with a pencil to change the deadline.
export function RsvpDeadlineCard({ eventId, rsvpDeadline, startAt, canWrite }: RsvpDeadlineCardProps) {
    const t = useTranslations('ManagePage.rsvpStats');
    const locale = useLocale();
    const [editing, setEditing] = useState(false);
    const countdown = rsvpCountdown(rsvpDeadline, startAt);
    const date = formatDate(locale, countdown.target, { day: 'numeric', month: 'long', year: 'numeric' });

    return (
        <section className="flex items-center gap-3 rounded-[20px] bg-surface-muted px-4 py-3.5">
            {/* Icon */}
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary">
                <CalendarClock className="h-5 w-5" aria-hidden="true" />
            </span>

            {/* Countdown */}
            <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-ink-muted">{t(countdown.labelKey)}</p>
                <p className="text-[15px] font-bold wrap-break-word text-ink">
                    {t('daysToGo', { count: countdown.daysLeft })} · {date}
                </p>
            </div>

            {/* Edit */}
            {canWrite && (
                <button
                    type="button"
                    aria-label={t('editDeadline')}
                    onClick={() => setEditing(true)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background text-ink-muted transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none"
                >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                </button>
            )}

            {/* Sheet */}
            <RsvpDeadlineSheet eventId={eventId} rsvpDeadline={rsvpDeadline} open={editing} onCloseAction={() => setEditing(false)} />
        </section>
    );
}
