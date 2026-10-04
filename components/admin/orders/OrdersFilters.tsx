'use client';

import { ChevronDown, Search, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';

import { adminInputClass } from '@/components/admin/AdminField';
import {
    type AdminOrderFilters,
    BUYER_TYPES,
    countMoreFilters,
    ORDER_KINDS,
    ORDER_QUERY_MAX_LENGTH,
    ORDER_STATUSES,
    PAYMENT_PROVIDERS,
} from '@/lib/adminOrders';
import { cn } from '@/lib/utils';

const LABEL = 'text-[11px] font-bold tracking-wide text-ink-muted uppercase';

export function OrdersFilters({
    filters,
    search,
    buyerLabel,
    rangeInvalid,
    moreOpen,
    onFilterChangeAction,
    onSearchChangeAction,
    onClearBuyerAction,
    onToggleMoreAction,
}: {
    filters: AdminOrderFilters;
    search: string;
    buyerLabel: string | null;
    rangeInvalid: boolean;
    moreOpen: boolean;
    onFilterChangeAction: (event: ChangeEvent<HTMLSelectElement | HTMLInputElement>) => void;
    onSearchChangeAction: (event: ChangeEvent<HTMLInputElement>) => void;
    onClearBuyerAction: () => void;
    onToggleMoreAction: () => void;
}) {
    const t = useTranslations('AdminPage.orders');
    const moreCount = countMoreFilters(filters);

    return (
        <div className="space-y-3 border-b border-border p-4">
            {/* Main filters */}
            <div className="flex flex-wrap items-end gap-3">
                <label className="relative block min-w-64 flex-1 sm:max-w-sm">
                    <span className="sr-only">{t('filters.search')}</span>
                    <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-faint" />
                    <input
                        type="search"
                        value={search}
                        onChange={onSearchChangeAction}
                        maxLength={ORDER_QUERY_MAX_LENGTH}
                        spellCheck={false}
                        placeholder={t('filters.searchPlaceholder')}
                        className={adminInputClass('pl-9')}
                    />
                </label>
                <label className="flex flex-col gap-0.5">
                    <span className={LABEL}>{t('filters.status')}</span>
                    <select name="status" value={filters.status ?? ''} onChange={onFilterChangeAction} className={adminInputClass('w-40')}>
                        <option value="">{t('filters.any')}</option>
                        {ORDER_STATUSES.map((status) => (
                            <option key={status} value={status}>
                                {t(`status.${status}`)}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="flex flex-col gap-0.5">
                    <span className={LABEL}>{t('filters.kind')}</span>
                    <select name="kind" value={filters.kind ?? ''} onChange={onFilterChangeAction} className={adminInputClass('w-40')}>
                        <option value="">{t('filters.any')}</option>
                        {ORDER_KINDS.map((kind) => (
                            <option key={kind} value={kind}>
                                {t(`kind.${kind}`)}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="flex flex-col gap-0.5">
                    <span className={LABEL}>{t('filters.from')}</span>
                    <input type="date" name="from" value={filters.from} onChange={onFilterChangeAction} className={adminInputClass('w-40')} />
                </label>
                <label className="flex flex-col gap-0.5">
                    <span className={LABEL}>{t('filters.to')}</span>
                    <input
                        type="date"
                        name="to"
                        value={filters.to}
                        min={filters.from || undefined}
                        onChange={onFilterChangeAction}
                        aria-invalid={rangeInvalid}
                        className={adminInputClass('w-40')}
                    />
                </label>
                <button
                    type="button"
                    onClick={onToggleMoreAction}
                    aria-expanded={moreOpen}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-md px-3 text-sm font-semibold text-ink-muted hover:bg-canvas hover:text-ink"
                >
                    {moreCount > 0 ? t('filters.moreCount', { count: moreCount }) : t('filters.more')}
                    <ChevronDown className={cn('h-4 w-4 transition-transform', moreOpen && 'rotate-180')} aria-hidden />
                </button>
            </div>

            {/* More filters */}
            {moreOpen && (
                <div className="flex flex-wrap items-end gap-3">
                    <label className="flex flex-col gap-0.5">
                        <span className={LABEL}>{t('filters.buyerType')}</span>
                        <select name="buyerType" value={filters.buyerType ?? ''} onChange={onFilterChangeAction} className={adminInputClass('w-40')}>
                            <option value="">{t('filters.any')}</option>
                            {BUYER_TYPES.map((type) => (
                                <option key={type} value={type}>
                                    {t(`buyerType.${type}`)}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="flex flex-col gap-0.5">
                        <span className={LABEL}>{t('filters.provider')}</span>
                        <select name="provider" value={filters.provider ?? ''} onChange={onFilterChangeAction} className={adminInputClass('w-40')}>
                            <option value="">{t('filters.any')}</option>
                            {PAYMENT_PROVIDERS.map((provider) => (
                                <option key={provider} value={provider}>
                                    {t(`provider.${provider}`)}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="flex flex-col gap-0.5">
                        <span className={LABEL}>{t('filters.dispute')}</span>
                        <select
                            name="disputeOpen"
                            value={filters.disputeOpen === null ? '' : String(filters.disputeOpen)}
                            onChange={onFilterChangeAction}
                            className={adminInputClass('w-40')}
                        >
                            <option value="">{t('filters.any')}</option>
                            <option value="true">{t('filters.disputeOpen')}</option>
                            <option value="false">{t('filters.disputeNone')}</option>
                        </select>
                    </label>
                    <label className="flex flex-col gap-0.5">
                        <span className={LABEL}>{t('filters.comp')}</span>
                        <select
                            name="comp"
                            value={filters.comp === null ? '' : String(filters.comp)}
                            onChange={onFilterChangeAction}
                            className={adminInputClass('w-40')}
                        >
                            <option value="">{t('filters.any')}</option>
                            <option value="true">{t('filters.compOnly')}</option>
                            <option value="false">{t('filters.paidOnly')}</option>
                        </select>
                    </label>
                </div>
            )}

            {/* Buyer from an account */}
            {filters.buyerId && (
                <span className="inline-flex items-center gap-1 rounded-full bg-surface-muted py-1 pr-1 pl-3 text-xs font-semibold text-ink">
                    {t('filters.buyer', { name: buyerLabel ?? filters.buyerId })}
                    <button
                        type="button"
                        onClick={onClearBuyerAction}
                        aria-label={t('filters.clearBuyer')}
                        className="flex h-5 w-5 items-center justify-center rounded-full text-ink-faint hover:bg-card hover:text-ink"
                    >
                        <X className="h-3 w-3" />
                    </button>
                </span>
            )}

            {rangeInvalid && <p className="text-xs text-status-warn">{t('rangeInvalid')}</p>}
        </div>
    );
}
