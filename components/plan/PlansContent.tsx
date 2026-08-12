'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { EventPlanComparison } from '@/components/plan/EventPlanComparison';
import type { AppConfigResponseDto, PlanTierResponseDto } from '@/lib/api/types';
import { routes } from '@/lib/routes';

interface PlansContentProps {
    modules: AppConfigResponseDto['modules'];
    nextPlan: PlanTierResponseDto | null;
    plans: PlanTierResponseDto[];
    selectedPlan: PlanTierResponseDto | null;
    selectedPlanCode: string | null;
}

export function PlansContent({ modules, nextPlan, plans, selectedPlan, selectedPlanCode }: PlansContentProps) {
    const t = useTranslations('EventPlanSettingsPage');

    return (
        <main className="h-full overflow-y-auto">
            <div className="mx-auto max-w-6xl px-4 pb-24 pt-5 sm:pt-6 lg:pb-10">
                <Link href={routes.login} className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-dark">
                    <ArrowLeft className="h-3.5 w-3.5" />
                    {t('back')}
                </Link>

                <div className="mt-2 max-w-4xl">
                    <p className="text-[11px] font-semibold tracking-[0.18em] text-primary-dark uppercase">{t('compare.allPlansTitle')}</p>
                    <h1 className="mt-1 text-2xl font-bold text-ink">{t('compare.title')}</h1>
                    <p className="mt-1 text-sm text-ink-muted">
                        {selectedPlan && nextPlan ? t('compare.upgradeSubtitle', { plan: selectedPlan.name }) : t('compare.subtitle')}
                    </p>
                </div>

                {selectedPlan && nextPlan && (
                    <div className="mt-6 border-t border-border py-4">
                        <p className="text-[11px] font-semibold tracking-wide text-ink-faint uppercase">{t('compare.fromTo')}</p>
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
