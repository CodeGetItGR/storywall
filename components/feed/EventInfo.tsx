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
        <div className={cn(className, 'flex items-center justify-between')}>
            <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <p className="text-[1rem] alegreya-light">{formatted}</p>
            </div>
            <div className="flex items-center gap-1 text-[1rem] alegreya-light" hidden={!place}>
                <MapPin className="h-4 w-4" />
                <p className="text-nowrap text-ellipsis whitespace-nowrap">{place}</p>
            </div>
        </div>
    );
}
