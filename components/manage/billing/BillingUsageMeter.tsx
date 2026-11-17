import type { BillingUsageMeterData } from '@/hooks/useBillingPlanCard';
import { cn } from '@/lib/utils';

// One limit on the plan card: label, "used / limit" and a bar, like the Members page's tiles.
export function BillingUsageMeter({ meter, unlimitedLabel }: { meter: BillingUsageMeterData; unlimitedLabel: string }) {
    const over = meter.limitLabel !== null && meter.percent > 100;

    return (
        <div className="flex min-w-0 flex-col gap-1.5">
            {/* Label */}
            <span className="text-xs font-semibold text-ink-muted">{meter.label}</span>

            {/* Use */}
            <span className={cn('text-base font-bold text-ink tabular-nums', over && 'text-destructive')}>
                {meter.usedLabel}
                {meter.limitLabel !== null && <span className="font-medium text-ink-muted"> {`/ ${meter.limitLabel}`}</span>}
            </span>

            {/* Bar */}
            {meter.limitLabel !== null ? (
                <span className="block h-1.5 overflow-hidden rounded-full bg-white/80">
                    <span
                        className={cn('block h-full rounded-full bg-gradient-brand', over && 'bg-destructive')}
                        style={{ width: `${Math.max(0, Math.min(100, meter.percent))}%` }}
                    />
                </span>
            ) : (
                <span className="text-[11px] text-ink-faint">{unlimitedLabel}</span>
            )}
        </div>
    );
}
