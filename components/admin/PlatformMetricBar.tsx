import { cn } from '@/lib/utils';

export function PlatformMetricBar({ ratio, className }: { ratio: number; className?: string }) {
    // A non-zero share keeps a sliver of fill so it never reads as empty.
    const width = ratio > 0 ? `max(${Math.min(ratio, 1) * 100}%, 3px)` : '0%';

    return (
        <div className={cn('h-2 overflow-hidden rounded-full bg-surface-muted', className)}>
            <div className="h-full rounded-full bg-ink-muted" style={{ width }} />
        </div>
    );
}
