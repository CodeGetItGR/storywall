import { cn } from '@/lib/utils';

export function PlatformMetricFigure({
    label,
    value,
    hint,
    size = 'md',
    mono = false,
}: {
    label: string;
    value: string;
    hint?: string;
    size?: 'md' | 'lg';
    mono?: boolean;
}) {
    return (
        <div className="min-w-0">
            <p className="text-xs font-semibold text-ink-muted">{label}</p>
            <p className={cn('mt-1 font-bold tracking-tight text-ink tabular-nums', size === 'lg' ? 'text-3xl' : 'text-lg', mono && 'font-mono')}>
                {value}
            </p>
            {hint && <p className="mt-0.5 text-xs text-ink-faint">{hint}</p>}
        </div>
    );
}
