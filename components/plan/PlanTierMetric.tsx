import type { ReactNode } from 'react';

export function PlanTierMetric({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
    return (
        <div className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-2">
            <div className="mt-0.5 text-primary-dark/80">{icon}</div>
            <div className="min-w-0">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{label}</dt>
                <dd className="mt-0.5 text-sm font-semibold leading-5 text-ink">{value}</dd>
            </div>
        </div>
    );
}
