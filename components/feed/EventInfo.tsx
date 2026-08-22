import { useLocale } from 'next-intl';
import { MapPin, Calendar} from 'lucide-react'
import { formatDate } from '@/lib/datetime';
import { cn } from '@/lib/utils';

export function EventInfo({
    date,
    place,
    className,
}: {
    date: number
    place: string;
    className?: string;
}) {
    const locale = useLocale();

    const formatted = formatDate(locale, date, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).toUpperCase();

    return (
        <div className={cn(className, 'flex justify-between items-center')}>
            <div className={'flex gap-1 underline underline-offset-3 items-center'}>
                <Calendar className={'w-4 h-4'}/>
                <p className="text-[1rem] alegreya-light">{formatted}</p>
            </div>
            <div className={'flex gap-1 text-[1rem] alegreya-light underline underline-offset-3 items-center'}>
                <MapPin className={'w-4 h-4'}/>
                <p className={'text-ellipsis text-nowrap whitespace-nowrap'}>{place}</p>
            </div>
        </div>
    );
}
