'use client';

import { Loader2, Plus, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { ChangeEventHandler, KeyboardEvent, MouseEventHandler } from 'react';

import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { AdminTabPanel } from '@/components/admin/AdminTabs';
import type { UnlockDraft } from '@/lib/adminPlanEditor';
import type { PaidServiceResponseDto, PlanTierResponseDto, PlatformModuleResponseDto } from '@/lib/api/types';
import { formatMoney } from '@/lib/billing';
import { cn } from '@/lib/utils';

function billingSuffix(t: ReturnType<typeof useTranslations>, billingPeriod: PaidServiceResponseDto['billingPeriod']) {
    return billingPeriod === 'ONE_TIME' ? t('plans.modules.billingOnce') : t('plans.modules.billingMonthly');
}

export function PlanEditorAddonsTab({
    editorId,
    activeTab,
    plan,
    orderedModules,
    moduleUnlocks,
    unlockDraft,
    onOpenUnlockEditorAction,
    onCloseUnlockEditorAction,
    onUpdateUnlockDraftAction,
    onCreateUnlockAction,
    canCreateUnlock,
    isCreatingUnlock,
    onUnlockAction,
    isUpdatingUnlocks,
}: {
    editorId: string;
    activeTab: string;
    plan: PlanTierResponseDto;
    orderedModules: PlatformModuleResponseDto[];
    moduleUnlocks: PaidServiceResponseDto[];
    unlockDraft: UnlockDraft | null;
    onOpenUnlockEditorAction: MouseEventHandler<HTMLButtonElement>;
    onCloseUnlockEditorAction: () => void;
    onUpdateUnlockDraftAction: ChangeEventHandler<HTMLInputElement | HTMLSelectElement>;
    onCreateUnlockAction: () => void;
    canCreateUnlock: boolean;
    isCreatingUnlock: boolean;
    onUnlockAction: MouseEventHandler<HTMLButtonElement>;
    isUpdatingUnlocks: boolean;
}) {
    const t = useTranslations('AdminPage');
    const locale = useLocale();
    const excludedModules = orderedModules.filter((module) => !plan.moduleKeys.includes(module.moduleKey));

    function unlockAppliesToPlan(service: PaidServiceResponseDto) {
        return service.planTierIds.length === 0 || service.planTierIds.includes(plan.id);
    }

    function handleComposerKeyDown(event: KeyboardEvent<HTMLDivElement>) {
        if (event.key === 'Enter') {
            event.preventDefault();
            if (canCreateUnlock) onCreateUnlockAction();
        } else if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            onCloseUnlockEditorAction();
        }
    }

    return (
        <AdminTabPanel id={editorId} tabKey="addons" active={activeTab} className="pt-5">
            {/* Add-on guidance */}
            <p className="mb-3 max-w-2xl text-sm leading-6 text-ink-muted">{t('plans.sections.addonsHint')}</p>
            {excludedModules.length === 0 && <p className="text-sm text-ink-muted">{t('plans.modules.addonsEmpty')}</p>}

            {/* Add-on modules */}
            <div className="divide-y divide-border/70">
                {excludedModules.map((module) => {
                    const unlocks = moduleUnlocks.filter((service) => service.grantsModuleKey === module.moduleKey);
                    const planUnlocks = unlocks.filter(unlockAppliesToPlan);
                    const otherUnlocks = unlocks.filter((service) => !unlockAppliesToPlan(service));
                    const composerOpen = unlockDraft?.moduleKey === module.moduleKey;

                    return (
                        <div key={module.moduleKey} className="py-3 first:pt-0 last:pb-0">
                            {/* Module */}
                            <div>
                                <p className="text-sm font-semibold text-ink">{module.name}</p>
                                {module.description && <p className="mt-0.5 text-xs leading-5 text-ink-muted">{module.description}</p>}
                            </div>

                            {/* Add-on status */}
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                                <span
                                    className={cn(
                                        'rounded-full px-2 py-1 font-bold',
                                        planUnlocks.length > 0 ? 'bg-primary-light text-primary-dark' : 'bg-status-neutral-wash text-status-neutral'
                                    )}
                                >
                                    {planUnlocks.length > 0 ? t('plans.modules.paidAddon') : t('plans.modules.unavailable')}
                                </span>
                                {planUnlocks.map((service) => (
                                    <span
                                        key={service.id}
                                        className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-muted/70 py-1 pl-2.5 pr-1 font-semibold text-ink"
                                    >
                                        {service.name}
                                        <span className="font-medium text-ink-muted">
                                            {formatMoney(locale, service.priceAmountMinor, service.priceCurrency)}{' '}
                                            {billingSuffix(t, service.billingPeriod)}
                                        </span>
                                        <button
                                            type="button"
                                            data-action="remove"
                                            data-service-id={service.id}
                                            onClick={onUnlockAction}
                                            disabled={isUpdatingUnlocks}
                                            aria-label={t('plans.modules.removeAddonFrom', { addon: service.name })}
                                            className="inline-flex h-5 w-5 items-center justify-center rounded-full text-ink-muted transition hover:bg-status-danger-wash hover:text-status-danger disabled:opacity-50"
                                        >
                                            <X className="h-3.5 w-3.5" aria-hidden="true" />
                                        </button>
                                    </span>
                                ))}
                                {otherUnlocks.map((service) => (
                                    <button
                                        key={service.id}
                                        type="button"
                                        data-service-id={service.id}
                                        onClick={onUnlockAction}
                                        disabled={isUpdatingUnlocks}
                                        className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-border px-2.5 font-bold text-ink-muted transition hover:bg-surface-muted disabled:opacity-50"
                                    >
                                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                                        {t('plans.modules.useExistingAddon', { addon: service.name })} (
                                        {formatMoney(locale, service.priceAmountMinor, service.priceCurrency)}{' '}
                                        {billingSuffix(t, service.billingPeriod)})
                                    </button>
                                ))}
                                {planUnlocks.length === 0 && !composerOpen && (
                                    <button
                                        type="button"
                                        data-module-key={module.moduleKey}
                                        onClick={onOpenUnlockEditorAction}
                                        className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-border px-2.5 font-bold text-ink-muted transition hover:bg-surface-muted"
                                    >
                                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                                        {t('plans.modules.createAddon')}
                                    </button>
                                )}
                            </div>

                            {/* Add-on form */}
                            {composerOpen && unlockDraft && (
                                <div onKeyDown={handleComposerKeyDown} className="mt-3 rounded-lg border border-border bg-surface-muted/40 p-3">
                                    <p className="text-sm font-bold text-ink">
                                        {t('plans.modules.createAddonTitle', { module: unlockDraft.moduleName })}
                                    </p>
                                    <div className="mt-3 grid grid-cols-2 gap-3">
                                        <AdminField label={t('paidServices.fields.name')} required className="col-span-2">
                                            <input
                                                data-field="name"
                                                value={unlockDraft.name}
                                                onChange={onUpdateUnlockDraftAction}
                                                className={adminInputClass()}
                                            />
                                        </AdminField>
                                        <AdminField label={t('paidServices.fields.price')} required>
                                            <input
                                                data-field="price"
                                                type="number"
                                                min={0}
                                                step="0.01"
                                                value={unlockDraft.price}
                                                onChange={onUpdateUnlockDraftAction}
                                                className={adminInputClass()}
                                            />
                                        </AdminField>
                                        <AdminField label={t('paidServices.fields.priceCurrency')} required>
                                            <input
                                                data-field="priceCurrency"
                                                maxLength={3}
                                                value={unlockDraft.priceCurrency}
                                                onChange={onUpdateUnlockDraftAction}
                                                className={adminInputClass()}
                                            />
                                        </AdminField>
                                        <AdminField label={t('paidServices.fields.billingPeriod')} className="col-span-2" required>
                                            <select
                                                data-field="billingPeriod"
                                                value={unlockDraft.billingPeriod}
                                                onChange={onUpdateUnlockDraftAction}
                                                className={adminInputClass()}
                                            >
                                                <option value="MONTHLY">{t('paidServices.fields.billingPeriodMonthlyShort')}</option>
                                                <option value="ONE_TIME">{t('paidServices.fields.billingPeriodOnceShort')}</option>
                                            </select>
                                        </AdminField>
                                        <AdminField label={t('paidServices.fields.description')} optional className="col-span-2">
                                            <input
                                                data-field="description"
                                                value={unlockDraft.description}
                                                onChange={onUpdateUnlockDraftAction}
                                                className={adminInputClass()}
                                            />
                                        </AdminField>
                                    </div>

                                    {/* Add-on actions */}
                                    <div className="mt-3 flex justify-end gap-2">
                                        <button
                                            type="button"
                                            onClick={onCloseUnlockEditorAction}
                                            className="min-h-9 rounded-md border border-border px-3 text-xs font-bold text-ink-muted"
                                        >
                                            {t('cancel')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={onCreateUnlockAction}
                                            disabled={!canCreateUnlock}
                                            className="inline-flex min-h-9 items-center gap-2 rounded-md bg-ink px-3 text-xs font-bold text-white disabled:opacity-50"
                                        >
                                            {isCreatingUnlock && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                            {t('plans.modules.saveAddon')}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </AdminTabPanel>
    );
}
