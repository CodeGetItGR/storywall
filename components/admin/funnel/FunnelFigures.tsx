import { PlatformMetricFigure } from '@/components/admin/PlatformMetricFigure';
import { cn } from '@/lib/utils';

export type FunnelFigure = { key: string; label: string; value: string; hint?: string };

// A responsive grid of labelled figures for one section.
export function FunnelFigures({ figures, className }: { figures: FunnelFigure[]; className?: string }) {
    return (
        <div className={cn('grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 lg:grid-cols-5', className)}>
            {figures.map((figure) => (
                <PlatformMetricFigure key={figure.key} label={figure.label} value={figure.value} hint={figure.hint} />
            ))}
        </div>
    );
}
