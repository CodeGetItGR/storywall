'use client';

import { Plus, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { adminInputClass } from '@/components/admin/AdminField';
import { AdminSection } from '@/components/admin/AdminSection';
import type { PlanCreateDurations as PlanCreateDurationsState } from '@/hooks/usePlanCreateDurations';
import { MAX_DURATION_MONTHS, MIN_DURATION_MONTHS } from '@/lib/adminPlanDurations';

const ROW_GRID = 'grid grid-cols-[7rem_9rem_2rem] items-center gap-2';

export function PlanCreateDurations({ durations }: { durations: PlanCreateDurationsState }) {
    const t = useTranslations('AdminPage');
    const monthsLabel = t('plans.durations.months');
    const priceLabel = t('plans.durations.price');

    return (
        <AdminSection title={t('plans.sections.durations')} description={t('plans.durations.createHint')}>
            {/* Column labels */}
            <div className={`${ROW_GRID} mb-1 text-[11px] font-bold tracking-wide text-ink-muted uppercase`}>
                <span>{monthsLabel}</span>
                <span>{priceLabel}</span>
            </div>

            {/* Duration rows */}
            <div className="space-y-2">
                {durations.rows.map((row) => (
                    <div key={row.rowId} className={ROW_GRID}>
                        <input
                            aria-label={monthsLabel}
                            data-row-id={row.rowId}
                            data-field="months"
                            type="number"
                            min={MIN_DURATION_MONTHS}
                            max={MAX_DURATION_MONTHS}
                            step={1}
                            required
                            value={row.months}
                            onChange={durations.updateRow}
                            className={adminInputClass('font-mono')}
                        />
                        <input
                            aria-label={priceLabel}
                            data-row-id={row.rowId}
                            data-field="price"
                            type="number"
                            min={0}
                            step="0.01"
                            required
                            value={row.price}
                            onChange={durations.updateRow}
                            className={adminInputClass('font-mono')}
                        />
                        {durations.rows.length > 1 && (
                            <button
                                type="button"
                                data-row-id={row.rowId}
                                onClick={durations.removeRow}
                                aria-label={t('plans.durations.remove')}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-faint transition hover:bg-status-danger-wash hover:text-status-danger"
                            >
                                <X className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {/* Duplicate warning */}
            {durations.hasDuplicateMonths && <p className="mt-2 text-sm text-status-danger">{t('plans.durations.duplicateMonths')}</p>}

            {/* Add duration */}
            <button
                type="button"
                onClick={durations.addRow}
                className="mt-3 inline-flex min-h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs font-bold text-ink-muted transition hover:bg-surface-muted"
            >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                {t('plans.durations.add')}
            </button>
        </AdminSection>
    );
}
