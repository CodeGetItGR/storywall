'use client';

import { useTranslations } from 'next-intl';

import { adminInputClass } from '@/components/admin/AdminField';
import type { useModuleUsageFilters } from '@/hooks/useModuleUsageFilters';

const LABEL = 'text-[11px] font-bold tracking-wide text-ink-muted uppercase';

export function ModuleUsageFilters({ filters }: { filters: ReturnType<typeof useModuleUsageFilters> }) {
    const t = useTranslations('AdminPage.moduleUsage.filters');

    return (
        <div className="flex flex-wrap items-end gap-3">
            {/* Event type */}
            <label className="flex flex-col gap-0.5">
                <span className={LABEL}>{t('eventType')}</span>
                <select value={filters.eventTypeKey} onChange={filters.handleEventTypeChange} className={adminInputClass('w-48')}>
                    <option value="">{t('all')}</option>
                    {filters.eventTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </label>

            {/* Plan */}
            <label className="flex flex-col gap-0.5">
                <span className={LABEL}>{t('plan')}</span>
                <select value={filters.planCode} onChange={filters.handlePlanChange} className={adminInputClass('w-48')}>
                    <option value="">{t('all')}</option>
                    {filters.planOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </label>
        </div>
    );
}
