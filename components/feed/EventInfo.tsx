import { Calendar, MapPin } from 'lucide-react';
import { useLocale } from 'next-intl';

import { formatDate } from '@/lib/datetime';
import { cn } from '@/lib/utils';

export function EventInfo({ date, place, className }: { date: number; place: string; className?: string }) {
    const locale = useLocale();

    const formatted = formatDate(locale, date, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).toUpperCase();

    return (
        <div className={cn(className, 'flex items-center justify-between gap-3')}>
            {/* Date */}
            <div className="flex shrink-0 items-center gap-1">
                <Calendar className="h-4 w-4 shrink-0" />
                <p className="alegreya-light text-[1rem] whitespace-nowrap">{formatted}</p>
            </div>
            {/* Place */}
            <div className="flex min-w-0 items-center gap-1 alegreya-light text-[1rem]" hidden={!place}>
                <MapPin className="h-4 w-4 shrink-0" />
                <p className="truncate" title={place}>
                    {place}
                </p>
            </div>
        </div>
    );
}
