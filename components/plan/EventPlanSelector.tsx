'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { PlanCard } from '@/components/plan/PlanCard';
import { PlanMoreInfoSheet } from '@/components/plan/PlanMoreInfoSheet';
import type { PlanTierResponseDto, PlatformModuleResponseDto } from '@/lib/api/types';

type EventPlanSelectorProps = {
    plans: PlanTierResponseDto[];
    modules: PlatformModuleResponseDto[];
    selectedCode: string;
    onSelectAction: (code: string) => void;
    isLoading?: boolean;
};

export function EventPlanSelector({ plans, modules, selectedCode, onSelectAction, isLoading = false }: EventPlanSelectorProps) {
    const t = useTranslations('CreateEventPage');
    const [moreInfoOpen, setMoreInfoOpen] = useState(false);
    const [moreInfoPlan, setMoreInfoPlan] = useState<PlanTierResponseDto | null>(null);

    function openMoreInfo(code: string) {
        const plan = plans.find((planItem) => planItem.code === code);
        if (plan) {
            setMoreInfoPlan(plan);
            setMoreInfoOpen(true);
        }
    }

    function closeMoreInfo() {
        setMoreInfoOpen(false);
    }

    return (
        <div className="flex h-full flex-col">
            {/* Plan Content */}
            <div className="space-y-3">
                {isLoading && (
                    <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-white p-6 text-sm text-ink-muted">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t('loadingPlans')}
                    </div>
                )}
                {!isLoading && plans.length === 0 && <p className="rounded-xl bg-rose-50 p-4 text-sm text-rose-600">{t('noPlans')}</p>}
                {!isLoading &&
                    plans.map((plan) => (
                        <PlanCard
                            key={plan.id}
                            plan={plan}
                            modules={modules}
                            emphasis={selectedCode === plan.code ? 'primary' : undefined}
                            onSelectAction={onSelectAction}
                            onMoreInfoAction={openMoreInfo}
                        />
                    ))}
                <PlanMoreInfoSheet open={moreInfoOpen} onCloseAction={closeMoreInfo} plan={moreInfoPlan} modules={modules} />
            </div>
        </div>
    );
}
