'use client';

import { Archive, ArchiveRestore, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { ExtensionPlanPicker } from '@/components/admin/ExtensionPlanPicker';
import type { ExtensionDrawerState } from '@/hooks/useExtensionDrawer';
import type { LabeledExtensionPlanGroup } from '@/hooks/useExtensionPlanGroups';
import { MAX_DURATION_MONTHS, MIN_DURATION_MONTHS } from '@/lib/adminPlanDurations';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { PlanTierResponseDto } from '@/lib/api/types';

const FORM_ID = 'extension-form';

export function ExtensionDrawer({
    drawer,
    plans,
    groups,
    eventTypeLabel,
}: {
    drawer: ExtensionDrawerState;
    plans: PlanTierResponseDto[];
    groups: LabeledExtensionPlanGroup[];
    eventTypeLabel: (eventTypeKey: string) => string;
}) {
    const t = useTranslations('AdminPage');
    const { editing, draft } = drawer;
    const currency = extensionCurrency(plans, editing ? [editing.plan.id] : draft.planTierIds);

    return (
        <AdminDrawer
            open={drawer.open}
            onClose={drawer.close}
            closeLabel={t('cancel')}
            title={
                editing
                    ? t('plans.durations.edit', { duration: t('plans.columns.months', { count: editing.option.months }) })
                    : t('paidServices.extensions.newTitle')
            }
            footer={
                <>
                    {/* Retire */}
                    <div>
                        {editing && (
                            <button
                                type="button"
                                onClick={drawer.toggleActive}
                                disabled={drawer.isSaving}
                                className="inline-flex min-h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold text-ink-muted hover:bg-surface-muted disabled:opacity-50"
                            >
                                {editing.option.active ? (
                                    <Archive className="h-4 w-4" aria-hidden="true" />
                                ) : (
                                    <ArchiveRestore className="h-4 w-4" aria-hidden="true" />
                                )}
                                {editing.option.active ? t('plans.durations.retire') : t('plans.durations.reactivate')}
                            </button>
                        )}
                    </div>

                    {/* Save */}
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={drawer.close}
                            className="min-h-9 rounded-md border border-border px-3.5 text-sm font-semibold text-ink-muted"
                        >
                            {t('cancel')}
                        </button>
                        <button
                            type="submit"
                            form={FORM_ID}
                            disabled={!drawer.canSave}
                            className="inline-flex min-h-9 items-center gap-2 rounded-md bg-ink px-3.5 text-sm font-semibold text-white disabled:opacity-50"
                        >
                            {drawer.isSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                            {t('paidServices.extensions.save')}
                        </button>
                    </div>
                </>
            }
        >
            <form id={FORM_ID} onSubmit={drawer.save} className="space-y-5">
                {/* Plan */}
                {editing && (
                    <div>
                        <p className="mb-1.5 text-xs font-semibold tracking-wide text-ink-muted uppercase">{t('fields.plan')}</p>
                        <p className="text-sm font-semibold text-ink">{editing.plan.name}</p>
                        <p className="text-xs text-ink-faint">
                            {editing.plan.eventTypeKey && <span>{eventTypeLabel(editing.plan.eventTypeKey)} · </span>}
                            <span className="font-mono">{editing.plan.code}</span>
                        </p>
                    </div>
                )}

                {/* Length and price */}
                <div className="grid grid-cols-2 gap-3">
                    <AdminField label={t('plans.durations.months')} required hint={editing ? undefined : t('plans.durations.monthsHint')}>
                        <input
                            name="months"
                            type="number"
                            inputMode="numeric"
                            min={MIN_DURATION_MONTHS}
                            max={MAX_DURATION_MONTHS}
                            step={1}
                            required
                            value={draft.months}
                            onChange={drawer.updateDraft}
                            disabled={Boolean(editing)}
                            className={adminInputClass('font-mono')}
                        />
                    </AdminField>
                    <AdminField label={currency ? t('plans.durations.priceIn', { currency }) : t('plans.durations.price')} required>
                        <input
                            name="price"
                            type="number"
                            inputMode="decimal"
                            min={0.01}
                            step="0.01"
                            required
                            value={draft.price}
                            onChange={drawer.updateDraft}
                            className={adminInputClass('font-mono')}
                        />
                    </AdminField>
                </div>

                {/* Plans */}
                {!editing && (
                    <ExtensionPlanPicker
                        groups={groups}
                        picked={draft.planTierIds}
                        sellingLength={drawer.sellingLength}
                        onToggleAction={drawer.togglePlan}
                    />
                )}

                {/* Error */}
                {drawer.error && <p className="text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(drawer.error)}`)}</p>}
            </form>
        </AdminDrawer>
    );
}

// The currency the price is typed in: the picked plans' one, or none while they differ or none is picked.
function extensionCurrency(plans: PlanTierResponseDto[], planTierIds: string[]): string | null {
    const currencies = new Set(plans.filter((plan) => planTierIds.includes(plan.id)).map((plan) => plan.priceCurrency));
    return currencies.size === 1 ? ([...currencies][0] ?? null) : null;
}
