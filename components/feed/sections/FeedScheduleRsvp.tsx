'use client';

import { useTranslations } from 'next-intl';

import { AppLink } from '@/components/ui/AppLink';
import type { FeedScheduleRsvpLink } from '@/hooks/useFeedScheduleRsvp';
import { cn } from '@/lib/utils';

type FeedScheduleRsvpProps = FeedScheduleRsvpLink & { label: string; describedBy: string };

// A session's RSVP button: the RSVP module's name until the guest answers, then their answer. Both open the form there.
export function FeedScheduleRsvp({ answer, href, label, describedBy }: FeedScheduleRsvpProps) {
    const t = useTranslations('RSVPPage.stats');

    return (
        <AppLink
            href={href}
            aria-describedby={describedBy}
            className={cn(
                '-my-1.5 ml-2 inline-flex min-h-8 shrink-0 items-center rounded-full px-3 text-xs font-semibold focus-ring',
                answer === null && 'bg-(image:--logo) text-white',
                answer === 'attending' && 'bg-emerald-50 text-emerald-700',
                answer === 'declined' && 'bg-surface-muted text-ink-muted',
            )}
        >
            {answer === null ? label : t(answer)}
        </AppLink>
    );
}
