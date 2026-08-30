'use client';

import { useList } from '@refinedev/core';
import { Pencil, Plus, Search } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import React, { type ChangeEvent, useCallback, useMemo, useState } from 'react';

import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { ReactionTypeDrawer } from '@/components/admin/ReactionTypeDrawer';
import { LoadingState } from '@/components/ui/LoadingState';
import { useAdminPlatformEventTypes } from '@/hooks/useAdmin';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { EventTypeConvention, PlatformEventTypeResponseDto, ReactionTypeResponseDto } from '@/lib/api/types';
import { resolveLocalizedText } from '@/lib/localizedText';
import { cn } from '@/lib/utils';

const STATUS_FILTERS = ['ALL', 'AVAILABLE', 'ARCHIVED'] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const STATUS_PILL = {
    AVAILABLE: 'bg-status-good-wash text-status-good',
    ARCHIVED: 'bg-status-neutral-wash text-status-neutral',
} as const;

function statusOf(reactionType: ReactionTypeResponseDto): Exclude<StatusFilter, 'ALL'> {
    return reactionType.isAssignable ? 'AVAILABLE' : 'ARCHIVED';
}

export function ReactionTypesCatalogPanel() {
    const t = useTranslations('AdminPage.reactionTypes');
    const tAdmin = useTranslations('AdminPage');
    const locale = useLocale();
    const eventTypesQuery = useAdminPlatformEventTypes();
    const eventTypes = useMemo(
        () => [...(eventTypesQuery.data ?? [])].sort((left, right) => left.sortOrder - right.sortOrder),
        [eventTypesQuery.data]
    );
    const [selectedEventTypeKey, setSelectedEventTypeKey] = useState<EventTypeConvention | undefined>(eventTypes[0]?.eventTypeKey);
    const effectiveEventTypeKey = selectedEventTypeKey ?? eventTypes[0]?.eventTypeKey;
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
    const [search, setSearch] = useState('');
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedReactionType, setSelectedReactionType] = useState<ReactionTypeResponseDto | null>(null);

    const { result, query } = useList<ReactionTypeResponseDto>({
        resource: 'reaction-types',
        dataProviderName: 'reaction-types',
        filters: [
            { field: 'eventTypeKey', operator: 'eq', value: effectiveEventTypeKey },
            { field: 'includeArchived', operator: 'eq', value: true },
        ],
        pagination: { mode: 'off' },
        queryOptions: { enabled: Boolean(effectiveEventTypeKey) },
    });

    const reactionTypes = result.data;
    const activeCount = reactionTypes.filter((reactionType) => reactionType.isAssignable).length;
    const canCreateActive = activeCount < 5;

    const visibleReactionTypes = useMemo(() => {
        const needle = search.trim().toLowerCase();
        return reactionTypes.filter((reactionType) => {
            if (statusFilter !== 'ALL' && statusOf(reactionType) !== statusFilter) return false;
            if (!needle) return true;
            return reactionType.name.toLowerCase().includes(needle) || reactionType.code.toLowerCase().includes(needle);
        });
    }, [reactionTypes, search, statusFilter]);

    function handleEventTypeChange(event: ChangeEvent<HTMLSelectElement>) {
        setSelectedEventTypeKey(event.target.value as EventTypeConvention);
        setDrawerOpen(false);
        setSelectedReactionType(null);
    }

    const handleStatusFilterClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
        setStatusFilter(event.currentTarget.dataset.status as StatusFilter);
    }, []);

    const handleSearchChange = useCallback((event: ChangeEvent<HTMLInputElement>) => setSearch(event.target.value), []);

    const openCreate = useCallback(() => {
        setSelectedReactionType(null);
        setDrawerOpen(true);
    }, []);

    const openEdit = useCallback((reactionType: ReactionTypeResponseDto) => {
        setSelectedReactionType(reactionType);
        setDrawerOpen(true);
    }, []);

    const handleEditClick = useCallback(
        (event: React.MouseEvent<HTMLButtonElement>) => {
            const reactionTypeId = event.currentTarget.dataset.reactionTypeId;
            const reactionType = reactionTypes.find((item) => item.id === reactionTypeId);
            if (reactionType) openEdit(reactionType);
        },
        [openEdit, reactionTypes]
    );

    const closeDrawer = useCallback(() => setDrawerOpen(false), []);

    return (
        <div className="mx-auto max-w-6xl px-4 pb-16 pt-5 text-[15px] sm:px-6 lg:px-8 lg:pb-10 lg:pt-6">
            <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary-dark">{tAdmin('eyebrow')}</p>
                    <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{t('title')}</h1>
                    <p className="mt-1.5 max-w-2xl text-sm leading-6 text-ink-muted">{t('subtitle')}</p>
                </div>
                <button
                    type="button"
                    onClick={openCreate}
                    disabled={!effectiveEventTypeKey || !canCreateActive}
                    className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-ink px-4 text-sm font-semibold text-white shadow-sm disabled:opacity-40"
                >
                    <Plus className="h-4 w-4" />
                    {t('create')}
                </button>
            </header>

            {/* Event type controls */}
            <section className="mb-4 grid gap-3 rounded-xl border border-border bg-card p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                <AdminField label={t('eventType')} required>
                    <select value={effectiveEventTypeKey ?? ''} onChange={handleEventTypeChange} className={adminInputClass()}>
                        {eventTypes.map((eventType: PlatformEventTypeResponseDto) => (
                            <option key={eventType.eventTypeKey} value={eventType.eventTypeKey}>
                                {resolveLocalizedText(eventType.name, locale, eventType.eventTypeKey)}
                            </option>
                        ))}
                    </select>
                </AdminField>
                <div className="rounded-lg bg-canvas px-3 py-2">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">{t('activeCounter')}</p>
                    <p className={cn('mt-0.5 font-mono text-lg font-bold', canCreateActive ? 'text-ink' : 'text-status-warn')}>{activeCount}/5</p>
                </div>
            </section>

            <section className="rounded-xl border border-border bg-card">
                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3 border-b border-border p-3">
                    <div className="relative min-w-0 flex-1 sm:max-w-64">
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
                                {t(`status.${status}`)}
                            </button>
                        ))}
                    </div>
                    <p className="ml-auto shrink-0 text-xs font-semibold text-ink-faint">
                        {t('rowCount', { shown: visibleReactionTypes.length, total: reactionTypes.length })}
                    </p>
                </div>

                {(eventTypesQuery.isLoading || query.isLoading) && <LoadingState label={t('loading')} className="justify-start px-4 py-6" />}
                {(eventTypesQuery.error || query.error) && (
                    <p className="px-4 py-6 text-sm text-status-danger">
                        {t(`errors.${adminErrorMessageKey(eventTypesQuery.error ?? query.error)}`)}
                    </p>
                )}
                {!query.isLoading && !query.error && visibleReactionTypes.length === 0 && (
                    <p className="px-4 py-6 text-sm text-ink-muted">{t('empty')}</p>
                )}

                {!query.isLoading && !query.error && visibleReactionTypes.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[620px] border-collapse text-sm">
                            <thead>
                                <tr className="border-b border-border text-left text-[11px] font-bold uppercase tracking-wide text-ink-faint">
                                    <th className="px-4 py-2.5 font-bold">{t('columns.reaction')}</th>
                                    <th className="px-3 py-2.5 font-bold">{t('columns.code')}</th>
                                    <th className="px-3 py-2.5 font-bold">{t('columns.order')}</th>
                                    <th className="px-3 py-2.5 font-bold">{t('columns.status')}</th>
                                    <th className="px-3 py-2.5" />
                                </tr>
                            </thead>
                            <tbody>
                                {visibleReactionTypes.map((reactionType) => {
                                    const status = statusOf(reactionType);
                                    return (
                                        <tr key={reactionType.id} className="border-b border-border last:border-b-0 hover:bg-canvas/60">
                                            <td className="max-w-64 px-4 py-2.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-canvas text-lg">
                                                        {reactionType.emoji}
                                                    </span>
                                                    <p className="truncate font-semibold text-ink">{reactionType.name}</p>
                                                </div>
                                            </td>
                                            <td className="px-3 py-2.5 font-mono text-[12px] text-ink-muted">{reactionType.code}</td>
                                            <td className="px-3 py-2.5 font-mono text-ink">{reactionType.sortOrder}</td>
                                            <td className="px-3 py-2.5">
                                                <span className={cn('inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold', STATUS_PILL[status])}>
                                                    {t(`status.${status}`)}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2.5 text-right">
                                                <button
                                                    type="button"
                                                    data-reaction-type-id={reactionType.id}
                                                    onClick={handleEditClick}
                                                    aria-label={t('edit')}
                                                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-canvas hover:text-ink"
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {effectiveEventTypeKey && (
                <ReactionTypeDrawer
                    key={selectedReactionType?.id ?? `new-${effectiveEventTypeKey}`}
                    open={drawerOpen}
                    eventTypeKey={effectiveEventTypeKey}
                    reactionType={selectedReactionType}
                    reactionTypes={reactionTypes}
                    onCloseAction={closeDrawer}
                />
            )}
        </div>
    );
}
