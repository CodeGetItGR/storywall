import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export type OrderFact = {
    key: string;
    label: string;
    // Facts with no value are left out rather than shown as blanks.
    value: ReactNode | null;
    mono?: boolean;
};

export function OrderFactList({ facts }: { facts: OrderFact[] }) {
    const shown = facts.filter((fact) => fact.value !== null && fact.value !== undefined && fact.value !== '');
    if (shown.length === 0) return null;

    return (
        <dl className="grid max-w-3xl gap-x-8 gap-y-1.5 sm:grid-cols-2">
            {shown.map((fact) => (
                <div key={fact.key} className="flex min-w-0 items-baseline justify-between gap-4 text-sm">
                    <dt className="shrink-0 text-ink-muted">{fact.label}</dt>
                    <dd className={cn('min-w-0 truncate text-right font-medium text-ink', fact.mono && 'font-mono text-[12.5px] tabular-nums')}>
                        {fact.value}
                    </dd>
                </div>
            ))}
        </dl>
    );
}
