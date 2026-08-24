import { cn } from '@/lib/utils';

export function RefundEvidence({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
    return (
        <div className="min-w-0">
            <p className={cn('truncate text-sm font-semibold tabular-nums', muted ? 'text-ink-muted' : 'text-ink')} title={value}>
                {value}
            </p>
            <p className="text-[11px] leading-tight text-ink-muted">{label}</p>
        </div>
    );
}
