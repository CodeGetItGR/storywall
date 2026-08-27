'use client';

import { Sparkles } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { MouseEvent, ReactNode } from 'react';

import { PlanModuleIcons } from '@/components/plan/PlanModuleIcons';
import { PlanPriceLabel } from '@/components/plan/PlanPriceLabel';
import { useLocalizedPlanDescription } from '@/hooks/useLocalizedPlanDescription';
import type { PlanTierResponseDto, PlatformModuleResponseDto } from '@/lib/api/types';
import { formatMoney } from '@/lib/billing';
import { formatLimitValue } from '@/lib/planTiers';
import { cn } from '@/lib/utils';

type PlanCardProps = {
    plan: PlanTierResponseDto;
    modules: PlatformModuleResponseDto[];
    emphasis?: 'primary' | 'secondary';
    badge?: ReactNode;
    footer?: ReactNode;
    onSelectAction?: (code: string) => void;
    onMoreInfoAction?: (code: string) => void;
};

export function PlanCard({ plan, modules, emphasis, badge, footer, onSelectAction, onMoreInfoAction }: PlanCardProps) {
    const t = useTranslations('PlanCard');
    const locale = useLocale();
    const localizedPlanDescription = useLocalizedPlanDescription();
    const isSelectable = Boolean(onSelectAction);

    function renderLimit(value: number | null, unit: 'bytes' | 'count'): string {
        return formatLimitValue(value, unit) ?? t('unlimited');
    }

    function paidAddonModuleKeys(): string[] {
        return (plan.paidModules ?? []).map((service) => service.grantsModuleKey).filter((key): key is string => Boolean(key));
    }

    function paidAddonDetailByModuleKey(): Record<string, string> {
        const detail: Record<string, string> = {};
        for (const service of plan.paidModules ?? []) {
            if (!service.grantsModuleKey) continue;
            const price = formatMoney(locale, service.priceAmountMinor, service.priceCurrency);
            detail[service.grantsModuleKey] = t('oncePrice', { price });
        }
        return detail;
    }

    function handleSelect() {
        onSelectAction?.(plan.code);
    }

    function handleMoreInfo(event: MouseEvent<HTMLButtonElement>) {
        event.stopPropagation();
        onMoreInfoAction?.(plan.code);
    }

    const content = (
        <>
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex items-start justify-between w-full">
                    <div className="min-w-0 flex items-center gap-2">
                        <p className="truncate text-3xl font-bold text-ink">{plan.name}</p>
                        {badge}
                    </div>
                    <PlanPriceLabel plan={plan} locale={locale} fallback={t('noCharge')} className="block text-2xl font-bold text-primary-dark" />
                </div>
            </div>
            <p className="mt-2 text-sm leading-6 text-ink-muted">{localizedPlanDescription(plan)}</p>
            {/* Capabilities */}
            <div className="mt-4 flex items-baseline gap-8">
                <div>
                    <p className="text-2xl font-bold text-ink">{renderLimit(plan.maxMembers, 'count')}</p>
                    <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{t('members')}</p>
                </div>
                <div>
                    <p className="text-2xl font-bold text-ink">{renderLimit(plan.storageBytes, 'bytes')}</p>
                    <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{t('storage')}</p>
                </div>
            </div>
            <div className="mt-4">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{t('modules')}</p>
                <PlanModuleIcons moduleKeys={plan.moduleKeys} modules={modules} />
            </div>
            {(plan.paidModules?.length ?? 0) > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-ink-muted">
                    <span>{t('addonModules')}:</span>
                    <PlanModuleIcons
                        moduleKeys={paidAddonModuleKeys()}
                        modules={modules}
                        variant="addon"
                        detailByModuleKey={paidAddonDetailByModuleKey()}
                    />
                </div>
            )}
            <div className="mt-3.5 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted">
                <Sparkles className="h-5.5 w-5.5 text-primary-dark" />
                {t('originalsHighlight')}
            </div>
        </>
    );

    return (
        <div
            className={cn(
                'relative overflow-hidden rounded-xl border transition',
                emphasis === 'primary' && 'border-primary bg-primary-light/50',
                emphasis === 'secondary' && 'border-primary/20 bg-primary-light/20',
                !emphasis && 'border-border bg-white',
                isSelectable && emphasis !== 'primary' && 'hover:border-primary/40 hover:bg-primary-light/30'
            )}
        >
            {/* Accent */}
            <div className="h-1.5 w-full bg-gradient-logo" />
            {isSelectable ? (
                <button type="button" onClick={handleSelect} className="w-full p-4 text-left">
                    {content}
                </button>
            ) : (
                <div className="w-full p-4 text-left">{content}</div>
            )}
            {onMoreInfoAction && (
                <button
                    type="button"
                    onClick={handleMoreInfo}
                    className="group flex w-full flex-col items-center gap-1 border-t border-border/70 py-2.5 text-xs font-semibold text-ink-muted transition-colors hover:text-ink"
                >
                    {t('moreInfo')}
                </button>
            )}
            {footer && <div className="border-t border-border/70 p-3">{footer}</div>}
        </div>
    );
}
