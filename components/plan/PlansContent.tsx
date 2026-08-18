'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { EventPlanComparison } from '@/components/plan/EventPlanComparison';
import type { AppConfigResponseDto, PlanTierResponseDto } from '@/lib/api/types';
import { routes } from '@/lib/routes';

interface PlansContentProps {
    checkoutError: string | null;
    isCheckoutPending: boolean;
    modules: AppConfigResponseDto['modules'];
    paidServices: AppConfigResponseDto['paidServices'];
    nextPlan: PlanTierResponseDto | null;
    onUpgrade: (planTierCode: string) => void;
    pendingPlanCode: string | null;
    plans: PlanTierResponseDto[];
    retryIn: number;
    selectedPlan: PlanTierResponseDto | null;
    selectedPlanCode: string | null;
    upgradeTargets: PlanTierResponseDto[];
}

export function PlansContent({
    checkoutError,
    isCheckoutPending,
    modules,
    paidServices,
    nextPlan,
    onUpgrade,
    pendingPlanCode,
    plans,
    retryIn,
    selectedPlan,
    selectedPlanCode,
    upgradeTargets,
}: PlansContentProps) {
    const t = useTranslations('EventPlanSettingsPage');

    return (
        <main className="h-full overflow-y-auto">
            <div className="mx-auto max-w-6xl px-4 pb-24 pt-5 sm:pt-6 lg:pb-10">
                <Link href={routes.login} className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-dark">
                    <ArrowLeft className="h-3.5 w-3.5" />
                    {t('back')}
                </Link>

                <section className="mt-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-3xl">
                            <p className="text-[11px] font-semibold tracking-[0.18em] text-primary-dark uppercase">{t('compare.allPlansTitle')}</p>
                            <h1 className="mt-1 text-2xl font-bold text-ink">{t('compare.title')}</h1>
                            <p className="mt-1 text-sm leading-6 text-ink-muted">
                                {selectedPlan && nextPlan ? t('compare.upgradeSubtitle', { plan: selectedPlan.name }) : t('compare.subtitle')}
                            </p>
                        </div>

                        {selectedPlan && nextPlan && (
                            <div className="rounded-lg bg-surface-muted/55 px-3 py-2 text-sm lg:min-w-64">
                                <p className="text-[11px] font-semibold tracking-wide text-ink-faint uppercase">{t('compare.fromTo')}</p>
                                <p className="mt-1 font-semibold text-ink">
                                    {selectedPlan.name} <span className="text-ink-faint">{t('compare.to')}</span> {nextPlan.name}
                                </p>
                            </div>
                        )}
                    </div>
                </section>

                <div className="mt-6">
                    <EventPlanComparison
                        plans={plans}
                        modules={modules}
                        paidServices={paidServices}
                        currentPlanCode={selectedPlanCode}
                        currentPlan={selectedPlan}
                        isCheckoutPending={isCheckoutPending}
                        onUpgrade={onUpgrade}
                        pendingPlanCode={pendingPlanCode}
                        retryIn={retryIn}
                        upgradeTargets={upgradeTargets}
                    />
                </div>
                {checkoutError && <p className="mt-3 text-xs text-rose-600">{checkoutError}</p>}
            </div>
        </main>
    );
}
