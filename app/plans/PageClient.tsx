'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createContext, useContext } from 'react';

import { EventPlanComparison } from '@/components/plan/EventPlanComparison';
import { useAppConfig } from '@/hooks/useAppConfig';
import type { AppConfigResponseDto, PlanTierResponseDto } from '@/lib/api/types';
import { publicAssignablePlans } from '@/lib/planTiers';
import { routes } from '@/lib/routes';

type PlansPageContextValue = {
    errorMessage: string;
    modules: AppConfigResponseDto['modules'];
    nextPlan: PlanTierResponseDto | null;
    plans: PlanTierResponseDto[];
    selectedPlan: PlanTierResponseDto | null;
    selectedPlanCode: string | null;
    t: ReturnType<typeof useTranslations>;
};

const PlansPageContext = createContext<PlansPageContextValue | null>(null);

function usePlansPage() {
    const context = useContext(PlansPageContext);
    if (!context) {
        throw new Error('usePlansPage must be used within PlansPageContext');
    }

    return context;
}

export default function PlansPage() {
    const t = useTranslations('EventPlanSettingsPage');
    const searchParams = useSearchParams();
    const selectedPlanCode = searchParams.get('plan');
    const appConfig = useAppConfig();
    const plans = publicAssignablePlans(appConfig.data?.planTiers ?? [], 'EVENT');
    const selectedPlan = selectedPlanCode ? (plans.find((plan) => plan.code === selectedPlanCode) ?? null) : null;
    const selectedIndex = selectedPlan ? plans.findIndex((plan) => plan.id === selectedPlan.id) : -1;
    const nextPlan = selectedIndex >= 0 ? (plans[selectedIndex + 1] ?? null) : null;

    return (
        <PlansPageContext.Provider
            value={{
                errorMessage: t('loadError'),
                modules: appConfig.data?.modules ?? [],
                nextPlan,
                plans,
                selectedPlan,
                selectedPlanCode,
                t,
            }}
        >
            <PlansPageState hasError={Boolean(appConfig.error)} isLoading={appConfig.isLoading} />
        </PlansPageContext.Provider>
    );
}

function PlansPageState({ hasError, isLoading }: { hasError: boolean; isLoading: boolean }) {
    const { errorMessage } = usePlansPage();

    if (isLoading) {
        return <PlansLoadingState />;
    }

    if (hasError) {
        return <PlansErrorState message={errorMessage} />;
    }

    return <PlansContent />;
}

function PlansContent() {
    const { modules, nextPlan, plans, selectedPlan, selectedPlanCode, t } = usePlansPage();

    return (
        <main className="h-full overflow-y-auto">
            <div className="mx-auto max-w-6xl px-4 pb-24 pt-5 sm:pt-6 lg:pb-10">
                <Link href={routes.login} className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-dark">
                    <ArrowLeft className="h-3.5 w-3.5" />
                    {t('back')}
                </Link>

                <div className="mt-2 max-w-4xl">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-dark">{t('compare.allPlansTitle')}</p>
                    <h1 className="mt-1 text-2xl font-bold text-ink">{t('compare.title')}</h1>
                    <p className="mt-1 text-sm text-ink-muted">
                        {selectedPlan && nextPlan ? t('compare.upgradeSubtitle', { plan: selectedPlan.name }) : t('compare.subtitle')}
                    </p>
                </div>

                {selectedPlan && nextPlan && (
                    <div className="mt-6 border-t border-border py-4">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{t('compare.fromTo')}</p>
                        <p className="mt-1 text-sm font-semibold text-ink">
                            {selectedPlan.name} <span className="text-ink-faint">{t('compare.to')}</span> {nextPlan.name}
                        </p>
                        <p className="mt-1 text-sm text-ink-muted">{t('compare.nextPlanHint', { plan: nextPlan.name })}</p>
                    </div>
                )}

                <div className="mt-6">
                    <EventPlanComparison plans={plans} modules={modules} currentPlanCode={selectedPlanCode} />
                </div>
            </div>
        </main>
    );
}

function PlansLoadingState() {
    return (
        <main className="h-full overflow-y-auto">
            <div className="mx-auto max-w-6xl px-4 py-10">
                <div className="h-24 animate-pulse rounded-lg bg-surface-muted" />
            </div>
        </main>
    );
}

function PlansErrorState({ message }: { message: string }) {
    return (
        <main className="h-full overflow-y-auto">
            <div className="mx-auto max-w-6xl px-4 py-10">
                <p className="text-sm text-rose-600">{message}</p>
            </div>
        </main>
    );
}
