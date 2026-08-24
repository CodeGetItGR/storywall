import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export function QrStatsRow({ label, value, isWarning = false }: { label: string; value: ReactNode; isWarning?: boolean }) {
    return (
        <div className="flex items-center justify-between gap-4 px-3 py-2.5">
            <p className="text-sm text-ink-muted">{label}</p>
            <p className={cn('text-right text-sm font-semibold text-ink', isWarning && 'text-amber-700')}>{value}</p>
        </div>
    );
}
