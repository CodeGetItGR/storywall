'use client';

import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { PlanModuleConfigField } from '@/components/admin/plans/PlanModuleConfigField';
import type { ProvisionVendorSettings as Settings } from '@/hooks/useProvisionVendorSettings';
import { cn } from '@/lib/utils';

function noop() {}

// The vendors settings the event starts with, collapsed: they are the plan's until changed.
export function ProvisionVendorSettings({ settings }: { settings: Settings }) {
    const t = useTranslations('AdminPage');

    function fieldError(key: string) {
        if (!settings.errorKeys.includes(key)) return undefined;
        const field = settings.fields.find((item) => item.key === key);
        if (field?.type !== 'number') return undefined;
        return field.storage ? t('plans.grid.cell.invalidStorage') : t('plans.grid.cell.invalidNumberRange', { min: field.min ?? 0, max: field.max ?? 0 });
    }

    return (
        <section className="border-t border-border pt-6">
            {/* Toggle */}
            <button
                type="button"
                onClick={settings.toggleOpen}
                aria-expanded={settings.open}
                aria-controls="provision-vendor-settings"
                className="flex w-full items-center gap-2 text-left"
            >
                <span className="text-xs font-bold tracking-wide text-ink-faint uppercase">{t('accounts.provision.vendorSettings')}</span>
                {settings.changes.length > 0 && (
                    <span className="rounded-full bg-canvas px-2 py-0.5 text-[11px] font-bold text-ink">
                        {t('accounts.provision.vendorSettingsChanged', { count: settings.changes.length })}
                    </span>
                )}
                <ChevronDown className={cn('ml-auto h-4 w-4 text-ink-faint transition-transform', settings.open && 'rotate-180')} aria-hidden />
            </button>

            {/* Settings */}
            {settings.open && (
                <div id="provision-vendor-settings" className="mt-4 space-y-4">
                    {settings.isReady ? (
                        settings.fields.map((field) => (
                            <PlanModuleConfigField
                                key={field.key}
                                field={field}
                                value={settings.draft[field.key] ?? ''}
                                limited
                                error={fieldError(field.key)}
                                onLimitModeChangeAction={noop}
                                onLimitValueChangeAction={settings.handleValueChange}
                                onSwitchChangeAction={noop}
                                onTypeChangeAction={settings.handleTypeChange}
                            />
                        ))
                    ) : (
                        <p className="text-sm text-ink-muted">{t('accounts.provision.vendorSettingsLoading')}</p>
                    )}

                    {/* Vendors turned on */}
                    {settings.turnsVendorsOn && (
                        <p role="status" className="rounded-lg bg-status-warn-wash px-3 py-2.5 text-sm text-status-warn">
                            {t('accounts.provision.vendorSettingsTurnOn')}
                        </p>
                    )}
                </div>
            )}
        </section>
    );
}
