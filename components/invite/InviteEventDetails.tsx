import { CalendarDays, type LucideIcon, MapPin } from 'lucide-react';
import { useLocale } from 'next-intl';

import { formatEventDateParts } from '@/lib/datetime';

interface InviteEventDetailsProps {
    startAt: string | null | undefined;
    endAt: string | null | undefined;
    timeZone: string | null | undefined;
    locationName: string | null | undefined;
}

// When and where the event is, on the invite page.
export function InviteEventDetails({ startAt, endAt, timeZone, locationName }: InviteEventDetailsProps) {
    const locale = useLocale();
    const when = formatEventDateParts(locale, startAt, endAt, timeZone);
    const where = locationName?.trim() || null;

    if (!when && !where) return null;

    return (
        <ul className="space-y-4">
            {/* When */}
            {when && <InviteDetailRow icon={CalendarDays} primary={when.date} secondary={when.time} />}
            {/* Where */}
            {where && <InviteDetailRow icon={MapPin} primary={where} />}
        </ul>
    );
}

function InviteDetailRow({ icon: Icon, primary, secondary }: { icon: LucideIcon; primary: string; secondary?: string }) {
    return (
        <li className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-ink-muted">
                <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink">{primary}</span>
                {secondary && <span className="block text-sm text-ink-muted">{secondary}</span>}
            </span>
        </li>
    );
}
