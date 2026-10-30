'use client';

import { Search } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { adminInputClass } from '@/components/admin/AdminField';
import type { OutreachTableState } from '@/hooks/useOutreachTable';
import { OUTREACH_PRIORITIES, OUTREACH_STATUSES, OUTREACH_TYPES } from '@/lib/adminOutreach';

const SELECT = adminInputClass('w-auto min-w-0 pr-8');

export function OutreachFilters({ table, cities }: { table: OutreachTableState; cities: string[] }) {
    const t = useTranslations('AdminPage.outreach');
    const { filters } = table;

    return (
        <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <label className="relative min-w-[14rem] flex-1">
                <span className="sr-only">{t('filters.search')}</span>
                <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-faint" />
                <input
                    type="search"
                    value={filters.search}
                    onChange={table.handleSearchChange}
                    placeholder={t('filters.searchPlaceholder')}
                    className={adminInputClass('pl-9')}
                />
            </label>

            {/* Type */}
            <select aria-label={t('filters.type')} value={filters.type ?? ''} onChange={table.handleTypeChange} className={SELECT}>
                <option value="">{t('filters.allTypes')}</option>
                {OUTREACH_TYPES.map((type) => (
                    <option key={type} value={type}>
                        {t(`types.${type}`)}
                    </option>
                ))}
            </select>

            {/* City */}
            <select aria-label={t('filters.city')} value={filters.city ?? ''} onChange={table.handleCityChange} className={SELECT}>
                <option value="">{t('filters.allCities')}</option>
                {cities.map((city) => (
                    <option key={city} value={city}>
                        {city}
                    </option>
                ))}
            </select>

            {/* Status */}
            <select aria-label={t('filters.status')} value={filters.status ?? ''} onChange={table.handleStatusChange} className={SELECT}>
                <option value="">{t('filters.allStatuses')}</option>
                {OUTREACH_STATUSES.map((status) => (
                    <option key={status} value={status}>
                        {t(`status.${status}`)}
                    </option>
                ))}
            </select>

            {/* Priority */}
            <select aria-label={t('filters.priority')} value={filters.priority ?? ''} onChange={table.handlePriorityChange} className={SELECT}>
                <option value="">{t('filters.allPriorities')}</option>
                {OUTREACH_PRIORITIES.map((priority) => (
                    <option key={priority} value={priority}>
                        {t(`priority.${priority}`)}
                    </option>
                ))}
            </select>

            {/* Due only */}
            <label className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-semibold text-ink-muted">
                <input type="checkbox" checked={filters.dueOnly} onChange={table.handleDueOnlyChange} className="h-4 w-4 accent-primary" />
                {t('filters.dueOnly')}
            </label>

            {/* Clear */}
            {table.hasFilters && (
                <button type="button" onClick={table.clearFilters} className="min-h-10 px-2 text-sm font-semibold text-ink-muted hover:text-ink">
                    {t('filters.clear')}
                </button>
            )}
        </div>
    );
}
