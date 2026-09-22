'use client';

import { useTranslations } from 'next-intl';

import { MarketingPlanCard } from '@/components/plan/MarketingPlanCard';
import { LoadingState } from '@/components/ui/LoadingState';
import { useMarketingPlanOptions } from '@/hooks/useMarketingPlanOptions';
import type { AppMediaConfigDto, PlanTierResponseDto, PlatformModuleResponseDto } from '@/lib/api/types';

type EventPlanSelectorProps = {
    plans: PlanTierResponseDto[];
    modules: PlatformModuleResponseDto[];
    media: AppMediaConfigDto | null;
    selectedCode: string;
    onSelectAction: (code: string) => void;
    isLoading?: boolean;
};

export function EventPlanSelector({ plans, modules, media, selectedCode, onSelectAction, isLoading = false }: EventPlanSelectorProps) {
    const t = useTranslations('CreateEventPage');
    const tPricing = useTranslations('LandingPage.pricing');
    const options = useMarketingPlanOptions({ plans, modules, media, priceFallback: t('payment.noCharge') });
    const showLoading = isLoading || !media;

    return (
        <div className="flex h-full flex-col">
            {/* Plan Content */}
            <div>
                {showLoading && <LoadingState label={t('loadingPlans')} className="rounded-xl border border-border bg-white p-6" />}
                {!showLoading && options.length === 0 && <p className="rounded-xl bg-rose-50 p-4 text-sm text-rose-600">{t('noPlans')}</p>}
                {!showLoading && options.length > 0 && (
                    <div className="grid gap-5 min-[761px]:grid-cols-3 min-[761px]:gap-6" role="group" aria-label={t('steps.planSubtitle')}>
                        {options.map(({ config, featured, presentation }) => (
                            <MarketingPlanCard
                                key={config.id}
                                planCode={config.code}
                                plan={presentation}
                                featured={featured}
                                popularLabel={tPricing('popular')}
                                storageLabel={tPricing('storageLabel')}
                                selected={selectedCode === config.code}
                                selectionLabel={selectedCode === config.code ? t('planSelected') : tPricing('choose')}
                                onSelectAction={onSelectAction}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
