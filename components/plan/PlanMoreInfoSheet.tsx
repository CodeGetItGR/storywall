'use client';

import { useLocale, useTranslations } from 'next-intl';

import { PlanModuleIcons } from '@/components/plan/PlanModuleIcons';
import { PlanPriceLabel } from '@/components/plan/PlanPriceLabel';
import { Modal } from '@/components/ui/modal';
import type { PlanTierResponseDto, PlatformModuleResponseDto } from '@/lib/api/types';
import { formatPlanDiscount } from '@/lib/planComparison';
import { formatLimitValue } from '@/lib/planTiers';

type PlanMoreInfoSheetProps = {
    open: boolean;
    onCloseAction: () => void;
    plan: PlanTierResponseDto | null;
    modules: PlatformModuleResponseDto[];
};

export function PlanMoreInfoSheet({ open, onCloseAction, plan, modules }: PlanMoreInfoSheetProps) {
    const t = useTranslations('CreateEventPage');
    const locale = useLocale();

    if (!plan) return null;

    const discount = formatPlanDiscount(plan);
    const addOnModuleKeys = plan.paidModules?.map((service) => service.grantsModuleKey).filter((key): key is string => Boolean(key)) ?? [];

    return (
        <Modal open={open} onClose={onCloseAction} size="sm" variant="sheet" closeLabel={t('moreInfoClose')}>
            <Modal.Body className="px-4 pb-5 pt-12 sm:px-5">
                <div className="space-y-5">
                    <div>
                        <h2 className="text-lg font-semibold text-ink">{t('moreInfoTitle')}</h2>
                        <p className="mt-1 text-sm font-semibold text-ink">{plan.name}</p>
                        <p className="mt-1 text-sm leading-6 text-ink-muted">{t('moreInfoSubtitle')}</p>
                    </div>

                    <div className="space-y-3">
                        <div className="rounded-xl bg-surface-muted/70 px-3 py-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{t('moreInfoDescription')}</p>
                            <p className="mt-1 text-sm leading-6 text-ink-muted">{plan.description ?? t('planDescriptionFallback')}</p>
                        </div>

                        <div className="rounded-xl bg-surface-muted/70 px-3 py-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{t('moreInfoActivation')}</p>
                            <PlanPriceLabel
                                plan={plan}
                                kind="activation"
                                locale={locale}
                                fallback={t('payment.noCharge')}
                                className="mt-1 block text-base font-bold text-ink"
                            />
                        </div>

                        <div className="rounded-xl bg-surface-muted/70 px-3 py-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{t('moreInfoRecurring')}</p>
                            <PlanPriceLabel
                                plan={plan}
                                kind="recurring"
                                locale={locale}
                                fallback={t('payment.noCharge')}
                                className="mt-1 block text-base font-bold text-ink"
                            />
                        </div>

                        <div className="rounded-xl bg-surface-muted/70 px-3 py-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{t('moreInfoMembers')}</p>
                            <p className="mt-1 text-base font-bold text-ink">{formatLimitValue(plan.maxMembers, 'count') ?? t('unlimited')}</p>
                        </div>

                        <div className="rounded-xl bg-surface-muted/70 px-3 py-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{t('moreInfoStorage')}</p>
                            <p className="mt-1 text-base font-bold text-ink">{formatLimitValue(plan.storageBytes, 'bytes') ?? t('unlimited')}</p>
                        </div>

                        <div className="rounded-xl bg-surface-muted/70 px-3 py-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{t('moreInfoCoverage')}</p>
                            <p className="mt-1 text-base font-bold text-ink">
                                {plan.includedMonths === null ? t('unlimited') : t('monthCount', { count: plan.includedMonths })}
                            </p>
                        </div>

                        {discount !== '-' && (
                            <div className="rounded-xl bg-surface-muted/70 px-3 py-3">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{t('moreInfoDiscount')}</p>
                                <p className="mt-1 text-base font-bold text-ink">{discount}</p>
                            </div>
                        )}
                    </div>

                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">{t('moreInfoModules')}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                            <PlanModuleIcons moduleKeys={plan.moduleKeys} modules={modules} />
                        </div>
                    </div>

                    {addOnModuleKeys.length > 0 && (
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">{t('moreInfoAddons')}</p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                <PlanModuleIcons moduleKeys={addOnModuleKeys} modules={modules} variant="addon" />
                            </div>
                        </div>
                    )}
                </div>
            </Modal.Body>
        </Modal>
    );
}
