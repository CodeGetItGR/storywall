'use client';

import { useTranslations } from 'next-intl';

import type { PendingCellSave } from '@/hooks/usePlanModuleCellDraft';

export function PlanModuleChangeList({ pending }: { pending: PendingCellSave | null }) {
    const t = useTranslations('AdminPage.plans.grid.cell');

    if (!pending) return null;
    const rows = [
        ...(pending.includedBefore !== pending.includedAfter
            ? [{ key: t('included'), before: pending.includedBefore ? t('yes') : t('no'), after: pending.includedAfter ? t('yes') : t('no') }]
            : []),
        ...pending.changes,
    ];

    return (
        <ul className="space-y-1.5 text-sm">
            {rows.map((row) => (
                <li key={row.key} className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-semibold text-ink">{row.key}</span>
                    <span className="font-mono text-xs text-ink-faint line-through">{row.before}</span>
                    <span className="font-mono text-xs text-ink">{row.after}</span>
                </li>
            ))}
        </ul>
    );
}
