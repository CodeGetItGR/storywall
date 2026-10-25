import { CalendarDays, Church, Gift, MapPin, Martini } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { MockPhoto } from '@/components/occasions/wedding/mock/MockPhoto';
import type { OccasionPhoto } from '@/lib/occasions/occasionMedia';
import { cn } from '@/lib/utils';

const ROUND_BUTTON =
    'absolute right-[3cqw] grid size-[11.5cqw] place-items-center rounded-full bg-white/85 text-[#ff765f] shadow-[0_2cqw_5cqw_rgba(0,0,0,0.12)]';

type FeedCoverProps = {
    date: string;
    loading?: 'eager' | 'lazy';
    photo: OccasionPhoto;
    place: string;
    title: string;
};

// The event's cover with the couple's names and the venue, drinks and gifts buttons, then the date
// and place.
export function FeedCover({ date, loading, photo, place, title }: FeedCoverProps) {
    const t = useTranslations('ImageAlt');

    return (
        <>
            {/* Cover */}
            <div className="relative mx-[2.6cqw] overflow-hidden rounded-[5cqw]">
                <MockPhoto
                    alt={t('eventCoverOf', { name: title })}
                    className="block aspect-[16/9] w-full"
                    loading={loading}
                    photo={photo}
                    sizes="(min-width: 901px) 360px, 62vw"
                />
                <p className="absolute inset-x-0 bottom-0 m-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.45),transparent)] px-[5cqw] pt-[10cqw] pb-[4cqw] [font-family:var(--editorial)] text-[6.2cqw] leading-none text-white">
                    {title}
                </p>
                <span className={cn(ROUND_BUTTON, 'top-[3cqw]')}>
                    <Church className="size-[6cqw]" strokeWidth={1.6} />
                </span>
                <span className={cn(ROUND_BUTTON, 'top-[16.5cqw]')}>
                    <Martini className="size-[6cqw]" strokeWidth={1.6} />
                </span>
                <span className={cn(ROUND_BUTTON, 'bottom-[3cqw]')}>
                    <Gift className="size-[6cqw]" strokeWidth={1.6} />
                </span>
            </div>
            {/* Date and place */}
            <div className="flex items-center justify-between px-[4.4cqw] pt-[3.4cqw] [font-family:var(--editorial)] text-[4cqw] leading-none">
                <span className="flex items-center gap-[1.6cqw]">
                    <CalendarDays className="size-[4.2cqw]" strokeWidth={1.7} />
                    {date}
                </span>
                <span className="flex items-center gap-[1.4cqw]">
                    <MapPin className="size-[4.2cqw]" strokeWidth={1.7} />
                    {place}
                </span>
            </div>
        </>
    );
}
