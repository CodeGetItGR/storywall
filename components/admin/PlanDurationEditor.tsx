'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ChangeEventHandler, KeyboardEventHandler } from 'react';

import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { type DurationDraft, MAX_DURATION_MONTHS, MIN_DURATION_MONTHS } from '@/lib/adminPlanDurations';
import type { CoverageOptionResponseDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

export function PlanDurationEditor({
    draft,
    option,
    currency,
    canSave,
    isSaving,
    inset,
    onChangeAction,
    onKeyDownAction,
    onSaveAction,
    onCancelAction,
    onToggleActiveAction,
}: {
    draft: DurationDraft;
    // The duration being edited; null while adding a new one.
    option: CoverageOptionResponseDto | null;
    currency: string | null;
    canSave: boolean;
    isSaving: boolean;
    // Inside the bordered row list the editor drops its own border.
    inset?: boolean;
    onChangeAction: ChangeEventHandler<HTMLInputElement>;
    onKeyDownAction: KeyboardEventHandler<HTMLDivElement>;
    onSaveAction: () => void;
    onCancelAction: () => void;
    onToggleActiveAction: () => void;
}) {
    const t = useTranslations('AdminPage');

    return (
        <div onKeyDown={onKeyDownAction} className={cn('bg-surface-muted/40 p-3', !inset && 'rounded-lg border border-border')}>
            {/* Title */}
            <p className="text-sm font-bold text-ink">
                {option ? t('plans.columns.months', { count: option.months }) : t('plans.durations.newTitle')}
            </p>

            {/* Fields */}
            <div className="mt-3 grid grid-cols-3 gap-3">
                {!option && (
                    <AdminField label={t('plans.durations.months')} required hint={t('plans.durations.monthsHint')}>
                        <input
                            data-field="months"
                            type="number"
                            min={MIN_DURATION_MONTHS}
                            max={MAX_DURATION_MONTHS}
                            step={1}
                            value={draft.months}
                            onChange={onChangeAction}
                            autoFocus
                            className={adminInputClass('font-mono')}
                        />
                    </AdminField>
                )}
                <AdminField label={currency ? t('plans.durations.priceIn', { currency }) : t('plans.durations.price')} required>
                    <input
                        data-field="price"
                        type="number"
                        min={0}
                        step="0.01"
                        value={draft.price}
                        onChange={onChangeAction}
                        autoFocus={Boolean(option)}
                        className={adminInputClass('font-mono')}
                    />
                </AdminField>
                <AdminField label={t('plans.durations.sortOrder')} required>
                    <input
                        data-field="sortOrder"
                        type="number"
                        min={0}
                        step={1}
                        value={draft.sortOrder}
                        onChange={onChangeAction}
                        className={adminInputClass('font-mono')}
                    />
                </AdminField>
            </div>

            {/* Actions */}
            <div className="mt-3 flex items-center gap-2">
                {option && (
                    <button
                        type="button"
                        onClick={onToggleActiveAction}
                        disabled={isSaving}
                        className={cn(
                            'min-h-9 rounded-md px-2 text-xs font-bold transition disabled:opacity-50',
                            option.active ? 'text-status-danger hover:bg-status-danger-wash' : 'text-primary-dark hover:bg-primary-light',
                        )}
                    >
                        {option.active ? t('plans.durations.retire') : t('plans.durations.reactivate')}
                    </button>
                )}
                <div className="ml-auto flex gap-2">
                    <button
                        type="button"
                        onClick={onCancelAction}
                        className="min-h-9 rounded-md border border-border px-3 text-xs font-bold text-ink-muted"
                    >
                        {t('cancel')}
                    </button>
                    <button
                        type="button"
                        onClick={onSaveAction}
                        disabled={!canSave}
                        className="inline-flex min-h-9 items-center gap-2 rounded-md bg-ink px-3 text-xs font-bold text-white disabled:opacity-50"
                    >
                        {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
                        {t('plans.durations.save')}
                    </button>
                </div>
            </div>
        </div>
    );
}
