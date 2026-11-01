import { cn } from '@/lib/utils';

// The green tick in a round badge. className sizes the badge and its background; iconClassName the tick.
export function QrWeddingCheck({ className, iconClassName }: { className?: string; iconClassName?: string }) {
    return (
        <span aria-hidden="true" className={cn('grid shrink-0 place-items-center rounded-full', className)}>
            <svg
                className={cn('fill-none stroke-[#2a6834] stroke-[2.6] [stroke-linecap:round] [stroke-linejoin:round]', iconClassName)}
                viewBox="0 0 24 24"
            >
                <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
        </span>
    );
}
