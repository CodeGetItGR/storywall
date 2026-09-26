import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export type Metric = {
    key: string;
    label: string;
    value: string | number;
    tone?: string;
};

// The cells are separated by the container's background showing through a 1px
// gap, so an odd count must never leave an empty grid slot - it would paint as a
// stray block of border colour. Each count picks a layout that always fills up.
const columnClass: Record<number, string> = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-4',
    5: 'grid-cols-1 xs:grid-cols-5',
    6: 'grid-cols-2 sm:grid-cols-6',
};

/**
 * One grouped surface for a set of headline numbers: hairline-separated cells
 * instead of free-floating tiles, so a wide screen reads as a single strip.
 * A number shown here must not be restated elsewhere on the same view.
 */
export function MetricStrip({ items, className }: { items: Metric[]; className?: string }) {
    return (
        <dl
            className={cn(
                'grid gap-px overflow-hidden rounded-md border border-border bg-border',
                columnClass[items.length] ?? 'grid-cols-2 sm:grid-cols-4',
                className,
            )}
        >
            {items.map((item) => (
                <div key={item.key} className="flex flex-col gap-2 bg-background px-3.5 py-3 text-center">
                    <dd className={cn('mt-1 text-2xl leading-none font-extrabold text-ink tabular-nums', item.tone)}>{item.value}</dd>
                    <dt className="truncate text-[11px] font-bold tracking-wide text-ink-faint uppercase">{item.label}</dt>
                </div>
            ))}
        </dl>
    );
}

export function MetricStripSkeleton({ count = 4, className }: { count?: number; className?: string }) {
    return (
        <div
            aria-hidden="true"
            className={cn(
                'grid gap-px overflow-hidden rounded-md border border-border bg-border',
                columnClass[count] ?? 'grid-cols-2 sm:grid-cols-4',
                className,
            )}
        >
            {Array.from({ length: count }).map((_, index) => (
                <div key={index} className="flex flex-col items-center gap-2 bg-background px-3.5 py-3">
                    <Skeleton className="mt-1 h-6 w-10 rounded-md" />
                    <Skeleton className="h-2.5 w-16 rounded-full" />
                </div>
            ))}
        </div>
    );
}
