'use client';

import { useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';

import { PlanRow } from '@/components/admin/plans/PlanRow';
import type { PlanTierResponseDto, PlatformEventTypeResponseDto } from '@/lib/api/types';

export function EventTypePlansTable({
    plans,
    allPlans,
    eventTypes,
    onEditClickAction,
    onDuplicateClickAction,
    onSelectEventTypeAction,
}: {
    plans: PlanTierResponseDto[];
    allPlans: PlanTierResponseDto[];
    eventTypes: PlatformEventTypeResponseDto[];
    onEditClickAction: (event: MouseEvent<HTMLButtonElement>) => void;
    onDuplicateClickAction: (event: MouseEvent<HTMLButtonElement>) => void;
    onSelectEventTypeAction: (key: string) => void;
}) {
    const t = useTranslations('AdminPage.plans');

    if (plans.length === 0) return <p className="px-4 py-6 text-sm text-ink-muted">{t('empty')}</p>;

    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-[13px]">
                <thead>
                    <tr className="border-b border-border text-left text-[11px] font-bold tracking-wide text-ink-faint uppercase">
                        <th className="px-3 py-2 font-bold">{t('columns.plan')}</th>
                        <th className="px-2.5 py-2 font-bold">{t('columns.price')}</th>
                        <th className="px-2.5 py-2 font-bold">{t('columns.storage')}</th>
                        <th className="px-2.5 py-2 font-bold">{t('columns.members')}</th>
                        <th className="px-2.5 py-2 font-bold">{t('columns.durations')}</th>
                        <th className="px-2.5 py-2 font-bold">{t('columns.status')}</th>
                        <th className="px-2.5 py-2 font-bold">{t('columns.sharedGroup')}</th>
                        <th className="px-2.5 py-2" />
                    </tr>
                </thead>
                <tbody>
                    {plans.map((plan) => (
                        <PlanRow
                            key={plan.id}
                            plan={plan}
                            allPlans={allPlans}
                            eventTypes={eventTypes}
                            onEditClickAction={onEditClickAction}
                            onDuplicateClickAction={onDuplicateClickAction}
                            onSelectEventTypeAction={onSelectEventTypeAction}
                        />
                    ))}
                </tbody>
            </table>
        </div>
    );
}
