'use client';

import { Pencil, Plus, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';

import { AdminCodeStatusPill } from '@/components/admin/AdminCodeStatusPill';
import { AdminDiscountCodeDrawer } from '@/components/admin/AdminDiscountCodeDrawer';
import { adminInputClass } from '@/components/admin/AdminField';
import { AdminStatTile } from '@/components/admin/AdminStatTile';
import { LoadingState } from '@/components/ui/LoadingState';
import { useAdminDiscountCodes } from '@/hooks/useAdmin';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { CollaborationCodeStatus, DiscountCodeResponseDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

type DiscountCodeStatusFilter = 'ALL' | CollaborationCodeStatus;
const STATUS_FILTERS: DiscountCodeStatusFilter[] = ['ALL', 'ACTIVE', 'DISABLED'];

export function AdminDiscountCodesPanel() {
    const t = useTranslations('AdminPage.discountCodes');
    const tCodes = useTranslations('AdminPage.collaborations.codes');
    const tAdmin = useTranslations('AdminPage');
    const codesQuery = useAdminDiscountCodes();
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<DiscountCodeStatusFilter>('ALL');
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [editingCode, setEditingCode] = useState<DiscountCodeResponseDto | null>(null);

    const visibleCodes = useMemo(() => {
        const needle = search.trim().toLowerCase();
        const codes = codesQuery.data ?? [];
        return codes.filter((code) => {
            if (statusFilter !== 'ALL' && code.status !== statusFilter) return false;
            if (!needle) return true;
            return code.code.toLowerCase().includes(needle) || code.label.toLowerCase().includes(needle);
        });
    }, [codesQuery.data, search, statusFilter]);

    const stats = useMemo(() => {
        const codes = codesQuery.data ?? [];
        return codes.reduce(
            (current, code) => {
                current.total += 1;
                if (code.status === 'ACTIVE') current.active += 1;
                else current.disabled += 1;
                if (code.maxRedemptions !== null) current.capped += 1;
                return current;
            },
            { total: 0, active: 0, disabled: 0, capped: 0 }
        );
    }, [codesQuery.data]);

    const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => setSearch(event.target.value), []);
    const handleStatusFilterClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
        setStatusFilter(event.currentTarget.dataset.status as DiscountCodeStatusFilter);
    }, []);

    const openCreateCode = useCallback(() => {
        setEditingCode(null);
        setDrawerOpen(true);
    }, []);

    const closeDrawer = useCallback(() => setDrawerOpen(false), []);

    const handleEditCode = useCallback(
        (event: React.MouseEvent<HTMLButtonElement>) => {
            const codeId = event.currentTarget.dataset.codeId;
            const code = (codesQuery.data ?? []).find((item) => item.id === codeId);
            if (!code) return;
            setEditingCode(code);
            setDrawerOpen(true);
        },
        [codesQuery.data]
    );

    return (
        <div className="mx-auto max-w-6xl px-4 pb-16 pt-5 text-[15px] sm:px-6 lg:px-8 lg:pb-10 lg:pt-6">
            {/* Header */}
            <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary-dark">{tAdmin('eyebrow')}</p>
                    <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{t('title')}</h1>
                    <p className="mt-1.5 max-w-2xl text-sm leading-6 text-ink-muted">{t('description')}</p>
                </div>
                <button
                    type="button"
                    onClick={openCreateCode}
                    className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-ink px-4 text-sm font-semibold text-white shadow-sm"
                >
                    <Plus className="h-4 w-4" />
                    {t('create')}
                </button>
            </header>

            {/* Stats */}
            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <AdminStatTile label={t('stats.total')} value={stats.total} />
                <AdminStatTile label={t('stats.active')} value={stats.active} accent="text-status-good" />
                <AdminStatTile label={t('stats.disabled')} value={stats.disabled} accent="text-status-neutral" />
                <AdminStatTile label={t('stats.capped')} value={stats.capped} accent="text-primary-dark" />
            </div>

            {/* Discount codes catalog */}
            <section className="rounded-xl border border-border bg-card">
                <div className="flex flex-wrap items-center gap-3 border-b border-border p-3">
                    <div className="relative min-w-0 flex-1 sm:max-w-72">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
                        <input value={search} onChange={handleSearchChange} placeholder={t('search')} className={adminInputClass('w-full pl-8')} />
                    </div>
                    <div className="flex flex-wrap gap-1 rounded-lg bg-canvas p-1">
                        {STATUS_FILTERS.map((status) => (
                            <button
                                key={status}
                                type="button"
                                data-status={status}
                                onClick={handleStatusFilterClick}
                                aria-pressed={statusFilter === status}
                                className={cn(
                                    'rounded-md px-2.5 py-1.5 text-[12.5px] font-bold transition-colors',
                                    statusFilter === status ? 'bg-card text-ink shadow-sm' : 'text-ink-faint hover:text-ink-muted'
                                )}
                            >
                                {status === 'ALL' ? tCodes('status.ALL') : tCodes(`status.${status}`)}
                            </button>
                        ))}
                    </div>
                    <p className="ml-auto shrink-0 text-xs font-semibold text-ink-faint">
                        {t('rowCount', { shown: visibleCodes.length, total: codesQuery.data?.length ?? 0 })}
                    </p>
                </div>
                {codesQuery.isLoading && <LoadingState label={t('loading')} className="justify-start px-4 py-6" />}
                {codesQuery.error && (
                    <p className="px-4 py-6 text-sm text-status-danger">{tAdmin(`errors.${adminErrorMessageKey(codesQuery.error)}`)}</p>
                )}
                {!codesQuery.isLoading && !codesQuery.error && visibleCodes.length === 0 && (
                    <p className="px-4 py-6 text-sm text-ink-muted">{t('empty')}</p>
                )}
                {visibleCodes.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[680px] border-collapse text-left text-sm">
                            <thead>
                                <tr>
                                    <th className="border-b border-border px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-ink-faint">
                                        {tCodes('columns.code')}
                                    </th>
                                    <th className="border-b border-border px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-ink-faint">
                                        {tCodes('fields.discountPercent')}
                                    </th>
                                    <th className="border-b border-border px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-ink-faint">
                                        {tCodes('columns.redemptions')}
                                    </th>
                                    <th className="border-b border-border px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-ink-faint">
                                        {tCodes('columns.status')}
                                    </th>
                                    <th className="border-b border-border px-3 py-2.5" />
                                </tr>
                            </thead>
                            <tbody>
                                {visibleCodes.map((code) => (
                                    <tr key={code.id} className="border-b border-border last:border-b-0 hover:bg-canvas/60">
                                        <td className="max-w-64 px-4 py-2.5">
                                            <p className="font-mono text-xs font-bold text-ink">{code.code}</p>
                                            <p className="mt-1 truncate text-xs text-ink-muted">{code.label}</p>
                                        </td>
                                        <td className="px-3 py-2.5 font-mono text-ink">{code.discountPercent}%</td>
                                        <td className="px-3 py-2.5 font-mono text-ink">
                                            {code.liveRedemptions}
                                            {code.maxRedemptions !== null ? ` / ${code.maxRedemptions}` : ''}
                                        </td>
                                        <td className="px-3 py-2.5">
                                            <AdminCodeStatusPill status={code.status} />
                                        </td>
                                        <td className="px-3 py-2.5 text-right">
                                            <button
                                                type="button"
                                                data-code-id={code.id}
                                                onClick={handleEditCode}
                                                aria-label={t('edit')}
                                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-faint hover:bg-canvas hover:text-ink"
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                <AdminDiscountCodeDrawer
                    key={editingCode?.id ?? 'new-discount-code'}
                    open={drawerOpen}
                    code={editingCode}
                    onCloseAction={closeDrawer}
                />
            </section>
        </div>
    );
}
