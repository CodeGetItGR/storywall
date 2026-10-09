import { CalendarDays, MapPin } from 'lucide-react';
import { useLocale } from 'next-intl';

import { formatEventDateRange } from '@/lib/datetime';

interface InviteEventDetailsProps {
    startAt: string | null | undefined;
    endAt: string | null | undefined;
    timeZone: string | null | undefined;
    locationName: string | null | undefined;
}

// When and where the event is, on the invite page.
export function InviteEventDetails({ startAt, endAt, timeZone, locationName }: InviteEventDetailsProps) {
    const locale = useLocale();
    const when = formatEventDateRange(locale, startAt, endAt, timeZone);
    const where = locationName?.trim() || null;

    if (!when && !where) return null;

    return (
        <ul className="mb-5 space-y-2 text-sm text-ink">
            {/* When */}
            {when && (
                <li className="flex items-start gap-2.5">
                    <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
                    <span>{when}</span>
                </li>
            )}
            {/* Where */}
            {where && (
                <li className="flex items-start gap-2.5">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
                    <span>{where}</span>
                </li>
            )}
        </ul>
    );
}
