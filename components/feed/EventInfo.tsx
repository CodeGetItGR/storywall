import { Calendar, CalendarPlus, ChevronRight, MapPin } from 'lucide-react';
import { useLocale } from 'next-intl';

import { AppLink } from '@/components/ui/AppLink';
import { formatDate } from '@/lib/datetime';
import { cn } from '@/lib/utils';

// The tap cue after a tappable item; hover alone wouldn't show on touch screens.
const chevron = <ChevronRight className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />;

export function EventInfo({
    date,
    place,
    className,
    onDateClick,
    dateLabel,
    placeHref,
}: {
    date: number;
    place: string;
    className?: string;
    // Opens "add to calendar"; without it the date is plain text.
    onDateClick?: () => void;
    dateLabel?: string;
    // The main session's location page; without it the place is plain text.
    placeHref?: string | null;
}) {
    const locale = useLocale();

    const formatted = formatDate(locale, date, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).toUpperCase();

    const DateIcon = onDateClick ? CalendarPlus : Calendar;
    const dateContent = (
        <>
            <DateIcon className="h-4 w-4 shrink-0" />
            <span className="alegreya-light text-[1rem] whitespace-nowrap">{formatted}</span>
            {onDateClick && chevron}
        </>
    );
    const placeContent = (
        <>
            <MapPin className="h-4 w-4 shrink-0" />
            <span className="truncate" title={place}>
                {place}
            </span>
            {placeHref && chevron}
        </>
    );

    return (
        <div className={cn(className, 'flex items-center justify-between gap-3')}>
            {/* Date */}
            {onDateClick ? (
                <button
                    type="button"
                    onClick={onDateClick}
                    aria-label={dateLabel ? `${dateLabel}: ${formatted}` : undefined}
                    className="-mx-1 flex shrink-0 items-center gap-1 rounded-md px-1 py-1 focus-ring transition-opacity hover:opacity-70"
                >
                    {dateContent}
                </button>
            ) : (
                <div className="flex shrink-0 items-center gap-1">{dateContent}</div>
            )}
            {/* Place */}
            {place &&
                (placeHref ? (
                    <AppLink
                        href={placeHref}
                        className="-mx-1 flex min-w-0 items-center gap-1 rounded-md px-1 py-1 alegreya-light text-[1rem] focus-ring transition-opacity hover:opacity-70"
                    >
                        {placeContent}
                    </AppLink>
                ) : (
                    <div className="flex min-w-0 items-center gap-1 alegreya-light text-[1rem]">{placeContent}</div>
                ))}
        </div>
    );
}
