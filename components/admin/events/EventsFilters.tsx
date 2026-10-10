'use client';

import { Search, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';

import { adminInputClass } from '@/components/admin/AdminField';
import { type AdminEventFilters, EVENT_QUERY_MAX_LENGTH, EVENT_STATUSES, PLAN_CODE_MAX_LENGTH } from '@/lib/adminEvents';

const LABEL = 'text-[11px] font-bold tracking-wide text-ink-muted uppercase';

export function EventsFilters({
    filters,
    search,
    planCode,
    hostLabel,
    onSearchChangeAction,
    onPlanCodeChangeAction,
    onStatusChangeAction,
    onRestrictionChangeAction,
    onIncludeDeletedChangeAction,
    onClearHostAction,
}: {
    filters: AdminEventFilters;
    search: string;
    planCode: string;
    hostLabel: string | null;
    onSearchChangeAction: (event: ChangeEvent<HTMLInputElement>) => void;
    onPlanCodeChangeAction: (event: ChangeEvent<HTMLInputElement>) => void;
    onStatusChangeAction: (event: ChangeEvent<HTMLSelectElement>) => void;
    onRestrictionChangeAction: (event: ChangeEvent<HTMLSelectElement>) => void;
    onIncludeDeletedChangeAction: (event: ChangeEvent<HTMLInputElement>) => void;
    onClearHostAction: () => void;
}) {
    const t = useTranslations('AdminPage.events');

    return (
        <div className="space-y-3 border-b border-border p-4">
            {/* Filters */}
            <div className="flex flex-wrap items-end gap-3">
                <label className="relative block min-w-64 flex-1 sm:max-w-sm">
                    <span className="sr-only">{t('filters.search')}</span>
                    <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-faint" />
                    <input
                        type="search"
                        value={search}
                        onChange={onSearchChangeAction}
                        maxLength={EVENT_QUERY_MAX_LENGTH}
                        spellCheck={false}
                        placeholder={t('filters.searchPlaceholder')}
                        className={adminInputClass('pl-9')}
                    />
                </label>
                <label className="flex flex-col gap-0.5">
                    <span className={LABEL}>{t('filters.status')}</span>
                    <select value={filters.status ?? ''} onChange={onStatusChangeAction} className={adminInputClass('w-36')}>
                        <option value="">{t('filters.any')}</option>
                        {EVENT_STATUSES.map((status) => (
                            <option key={status} value={status}>
                                {t(`state.${status}`)}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="flex flex-col gap-0.5">
                    <span className={LABEL}>{t('filters.restriction')}</span>
                    <select value={filters.restriction} onChange={onRestrictionChangeAction} className={adminInputClass('w-40')}>
                        <option value="">{t('filters.any')}</option>
                        <option value="SUSPENDED">{t('filters.suspended')}</option>
                        <option value="NOT_SUSPENDED">{t('filters.notSuspended')}</option>
                        <option value="CLOSED">{t('filters.closed')}</option>
                    </select>
                </label>
                <label className="flex flex-col gap-0.5">
                    <span className={LABEL}>{t('filters.planCode')}</span>
                    <input
                        value={planCode}
                        onChange={onPlanCodeChangeAction}
                        maxLength={PLAN_CODE_MAX_LENGTH}
                        spellCheck={false}
                        className={adminInputClass('w-32 font-mono uppercase')}
                    />
                </label>
                <label className="flex min-h-10 items-center gap-2 text-sm font-semibold text-ink-muted">
                    <input type="checkbox" checked={filters.includeDeleted} onChange={onIncludeDeletedChangeAction} className="h-4 w-4" />
                    {t('filters.includeDeleted')}
                </label>
            </div>

            {/* Host from an account */}
            {filters.hostUserId && (
                <span className="inline-flex items-center gap-1 rounded-full bg-surface-muted py-1 pr-1 pl-3 text-xs font-semibold text-ink">
                    {t('filters.host', { name: hostLabel ?? filters.hostUserId })}
                    <button
                        type="button"
                        onClick={onClearHostAction}
                        aria-label={t('filters.clearHost')}
                        className="flex h-5 w-5 items-center justify-center rounded-full text-ink-faint hover:bg-card hover:text-ink"
                    >
                        <X className="h-3 w-3" />
                    </button>
                </span>
            )}
        </div>
    );
}
