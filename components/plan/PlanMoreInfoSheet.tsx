'use client';

import { useLocale, useTranslations } from 'next-intl';

import { Modal } from '@/components/ui/modal';
import type { PlanTierResponseDto, PlatformModuleResponseDto } from '@/lib/api/types';
import { formatMoney } from '@/lib/billing';
import { formatPlanDiscount } from '@/lib/planComparison';
import { enabledModuleKeys, getModuleMeta } from '@/lib/planModules';

type PlanMoreInfoSheetProps = {
    open: boolean;
    onCloseAction: () => void;
    plan: PlanTierResponseDto | null;
    modules: PlatformModuleResponseDto[];
};

export function PlanMoreInfoSheet({ open, onCloseAction, plan, modules }: PlanMoreInfoSheetProps) {
    const t = useTranslations('CreateEventPage');
    const tModules = useTranslations('Modules');
    const locale = useLocale();

    if (!plan) return null;

    const discount = formatPlanDiscount(plan);
    const includedModuleKeys = enabledModuleKeys(plan.moduleKeys, modules);
    const addOnServices = (plan.paidModules ?? []).filter((service) => service.grantsModuleKey);

    function moduleLabel(moduleKey: string) {
        const meta = getModuleMeta(moduleKey, modules);
        return {
            name: tModules.has(`${moduleKey}.name`) ? tModules(`${moduleKey}.name`) : meta.name,
            description: tModules.has(`${moduleKey}.description`) ? tModules(`${moduleKey}.description`) : meta.description,
            Icon: meta.Icon,
        };
    }

    return (
        <Modal open={open} onClose={onCloseAction} size="sm" variant="sheet" closeLabel={t('moreInfoClose')}>
            <Modal.Body className="px-4 pb-5 pt-12 sm:px-5">
                <div className="space-y-5">
                    <div>
                        <h2 className="text-lg font-semibold text-ink">{t('moreInfoTitle')}</h2>
                        <p className="mt-1 text-sm font-semibold text-ink">{plan.name}</p>
                    </div>

                    {discount !== '-' && (
                        <div className="rounded-xl bg-surface-muted/70 px-3 py-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{t('moreInfoDiscount')}</p>
                            <p className="mt-1 text-base font-bold text-ink">{discount}</p>
                        </div>
                    )}

                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">{t('moreInfoModules')}</p>
                        <ul className="mt-2 space-y-3">
                            {includedModuleKeys.map((moduleKey) => {
                                const { name, description, Icon } = moduleLabel(moduleKey);
                                return (
                                    <li key={moduleKey} className="flex gap-3">
                                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-background text-ink-muted">
                                            <Icon className="h-4 w-4" />
                                        </span>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-ink">{name}</p>
                                            <p className="mt-0.5 text-sm leading-6 text-ink-muted">{description}</p>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>

                    {addOnServices.length > 0 && (
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">{t('moreInfoAddons')}</p>
                            <ul className="mt-2 space-y-3">
                                {addOnServices.map((service) => {
                                    const { name, description, Icon } = moduleLabel(service.grantsModuleKey as string);
                                    const price = formatMoney(locale, service.priceAmountMinor, service.priceCurrency);
                                    return (
                                        <li key={service.id} className="flex gap-3">
                                            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-dashed border-border bg-background text-ink-muted opacity-60">
                                                <Icon className="h-4 w-4" />
                                            </span>
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-ink">
                                                    {name}{' '}
                                                    <span className="font-normal text-ink-muted">· {t('paidModules.oncePrice', { price })}</span>
                                                </p>
                                                <p className="mt-0.5 text-sm leading-6 text-ink-muted">{description}</p>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    )}
                </div>
            </Modal.Body>
        </Modal>
    );
}
