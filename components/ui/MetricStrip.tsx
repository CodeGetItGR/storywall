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
                'grid gap-px overflow-hidden rounded-2xl border border-border bg-border',
                columnClass[items.length] ?? 'grid-cols-2 sm:grid-cols-4',
                className
            )}
        >
            {items.map((item) => (
                <div key={item.key} className="bg-background px-3.5 py-3">
                    <dt className="truncate text-[11px] font-bold uppercase tracking-wide text-ink-faint">{item.label}</dt>
                    <dd className={cn('mt-1 text-2xl font-extrabold leading-none tabular-nums text-ink', item.tone)}>{item.value}</dd>
                </div>
            ))}
        </dl>
    );
}
