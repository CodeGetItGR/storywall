import { cn } from '@/lib/utils';

// clearPill: the Invitation | Social Feed pill sits half over the cover's bottom edge, so the title leaves it room.
type BannerTitleProps = { title: string; clearPill: boolean };

// The event's title under a cover illustration, in the page's ink.
export function BannerTitle({ title, clearPill }: BannerTitleProps) {
    return (
        <h1
            className={cn(
                'on-page event-heading px-5 pt-3 text-center alegreya-light text-4xl leading-tight text-balance text-event-title',
                clearPill && 'pb-9',
            )}
        >
            {title}
        </h1>
    );
}
