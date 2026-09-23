import { cn } from '@/lib/utils';

export function AdminStatTile({ label, value, accent }: { label: string; value: number; accent?: string }) {
    return (
        <div className="rounded-xl border border-border bg-card px-4 py-3">
            <p className="text-[11px] font-bold tracking-wide text-ink-faint uppercase">{label}</p>
            <p className={cn('mt-1 text-2xl font-extrabold text-ink tabular-nums', accent)}>{value}</p>
        </div>
    );
}
