'use client';

import { useList } from '@refinedev/core';
import { PackageMinus, Pencil, Plus, Search } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import React, { type ChangeEvent, useCallback, useMemo, useState } from 'react';

import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { useAdminNavigation } from '@/components/admin/AdminNavigationContext';
import { AdminSection } from '@/components/admin/AdminSection';
import { AdminStatTile } from '@/components/admin/AdminStatTile';
import { PaidServiceDrawer, type Visibility, visibilityOf } from '@/components/admin/PaidServiceDrawer';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { useAdminPlanTiers, useRemoveEventAddon } from '@/hooks/useAdmin';
import { adminErrorMessageKey, isUuid } from '@/lib/adminUtils';
import type { PaidServiceKind, PaidServiceResponseDto } from '@/lib/api/types';
import { formatMoney } from '@/lib/billing';
import { cn } from '@/lib/utils';

const KIND_FILTERS: Array<PaidServiceKind | 'ALL'> = ['ALL', 'STORAGE_PACK', 'RECURRING_ADDON', 'MODULE_UNLOCK'];
const STATUS_FILTERS: Array<Visibility | 'ALL'> = ['ALL', 'LIVE', 'HIDDEN', 'ARCHIVED'];

const STATUS_DOT: Record<Visibility, string> = {
    LIVE: 'bg-status-good',
    HIDDEN: 'bg-status-warn',
    ARCHIVED: 'bg-status-neutral',
};
const STATUS_PILL: Record<Visibility, string> = {
    LIVE: 'bg-status-good-wash text-status-good',
    HIDDEN: 'bg-status-warn-wash text-status-warn',
    ARCHIVED: 'bg-status-neutral-wash text-status-neutral',
};

export function PaidServicesCatalogPanel() {
    const t = useTranslations('AdminPage.paidServices');
    const tAdmin = useTranslations('AdminPage');
    const locale = useLocale();
    const { focus } = useAdminNavigation();

    const [kindFilter, setKindFilter] = useState<PaidServiceKind | 'ALL'>('ALL');
    const [statusFilter, setStatusFilter] = useState<Visibility | 'ALL'>('ALL');
    const [search, setSearch] = useState('');
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedService, setSelectedService] = useState<PaidServiceResponseDto | null>(null);

    const [eventId, setEventId] = useState('');
    const [eventTitle, setEventTitle] = useState<string | null>(null);
    const [pickedAddonCode, setAddonCode] = useState('');
    const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);
    const [appliedFocus, setAppliedFocus] = useState(focus);

    // A single unfiltered fetch backs the stat tiles, the table, and the
    // remove-addon picker alike — everything else (kind, status, search) is
    // client-side so switching filters never re-hits the network.
    const { result: servicesResult, query: servicesQuery } = useList<PaidServiceResponseDto>({
        resource: 'paid-services',
        filters: [{ field: 'includeArchived', operator: 'eq', value: true }],
        pagination: { mode: 'off' },
    });
    const eventPlans = useAdminPlanTiers('EVENT', true);
    const removeAddon = useRemoveEventAddon();

    const allServices = servicesResult.data;

    const stats = useMemo(() => {
        let live = 0;
        let hidden = 0;
        let archived = 0;
        for (const service of allServices) {
            const status = visibilityOf(service);
            if (status === 'LIVE') live += 1;
            else if (status === 'HIDDEN') hidden += 1;
            else archived += 1;
        }
        return { total: allServices.length, live, hidden, archived };
    }, [allServices]);

    const visibleServices = useMemo(() => {
        const needle = search.trim().toLowerCase();
        return allServices.filter((service) => {
            if (kindFilter !== 'ALL' && service.kind !== kindFilter) return false;
            if (statusFilter !== 'ALL' && visibilityOf(service) !== statusFilter) return false;
            if (!needle) return true;
            return (
                service.name.toLowerCase().includes(needle) ||
                service.code.toLowerCase().includes(needle) ||
                (service.description ?? '').toLowerCase().includes(needle)
            );
        });
    }, [allServices, kindFilter, statusFilter, search]);

    // Adjusting during render rather than in an effect: the prefilled id has to be
    // on screen the moment the panel opens, not one paint later.
    if (focus !== appliedFocus) {
        setAppliedFocus(focus);
        if (focus?.eventId) {
            setEventId(focus.eventId);
            setEventTitle(focus.eventTitle ?? null);
        }
    }

    // The code has to name a real catalog row, so it is picked from the list
    // rather than typed, and falls back to the first row instead of to empty.
    const addonCode = pickedAddonCode || allServices[0]?.code || '';

    function handleRemoveSubmit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!isUuid(eventId.trim()) || !addonCode) return;
        setConfirmRemoveOpen(true);
    }

    const confirmRemove = useCallback(async () => {
        await removeAddon.mutateAsync({ eventId: eventId.trim(), code: addonCode });
        setConfirmRemoveOpen(false);
    }, [addonCode, eventId, removeAddon]);

    const closeRemoveConfirm = useCallback(() => setConfirmRemoveOpen(false), []);

    const handleKindFilterClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
        setKindFilter(event.currentTarget.dataset.kind as PaidServiceKind | 'ALL');
    }, []);
    const handleStatusFilterClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
        setStatusFilter(event.currentTarget.dataset.status as Visibility | 'ALL');
    }, []);
    const handleSearchChange = useCallback((event: ChangeEvent<HTMLInputElement>) => setSearch(event.target.value), []);
    const handleAddonCodeChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => setAddonCode(event.target.value), []);

    const handleEventIdChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setEventId(event.target.value);
        setEventTitle(null);
    }, []);

    const openCreate = useCallback(() => {
        setSelectedService(null);
        setDrawerOpen(true);
    }, []);

    const openEdit = useCallback((service: PaidServiceResponseDto) => {
        setSelectedService(service);
        setDrawerOpen(true);
    }, []);

    const handleEditClick = useCallback(
        (event: React.MouseEvent<HTMLButtonElement>) => {
            const serviceId = event.currentTarget.dataset.serviceId;
            const service = allServices.find((item) => item.id === serviceId);
            if (service) openEdit(service);
        },
        [allServices, openEdit]
    );

    const closeDrawer = useCallback(() => {
        setDrawerOpen(false);
    }, []);

    const trimmedId = eventId.trim();
    const showIdError = trimmedId.length > 0 && !isUuid(trimmedId);
    const canRemove = isUuid(trimmedId) && Boolean(addonCode);
    const selectedAddon = allServices.find((service) => service.code === addonCode) ?? null;
    const plansById = useMemo(() => new Map((eventPlans.data ?? []).map((plan) => [plan.id, plan.name])), [eventPlans.data]);

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
                    className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-ink px-4 text-sm font-semibold text-white shadow-sm"
                >
                    <Plus className="h-4 w-4" />
                    {t('create')}
                </button>
            </header>

            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <AdminStatTile label={t('stats.total')} value={stats.total} />
                <AdminStatTile label={t('stats.live')} value={stats.live} accent="text-status-good" />
                <AdminStatTile label={t('stats.hidden')} value={stats.hidden} accent="text-status-warn" />
                <AdminStatTile label={t('stats.archived')} value={stats.archived} accent="text-status-neutral" />
            </div>

            <section className="rounded-xl border border-border bg-card">
                <div className="flex flex-wrap items-center gap-3 border-b border-border p-3">
                    <div className="relative min-w-0 flex-1 sm:max-w-64">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
                        <input
                            value={search}
                            onChange={handleSearchChange}
                            placeholder={t('search.placeholder')}
                            className={adminInputClass('w-full pl-8')}
                        />
                    </div>
                    <div className="flex flex-wrap gap-1 rounded-lg bg-canvas p-1">
                        {KIND_FILTERS.map((kind) => (
                            <button
                                key={kind}
                                type="button"
                                data-kind={kind}
                                onClick={handleKindFilterClick}
                                aria-pressed={kindFilter === kind}
                                className={cn(
                                    'rounded-md px-2.5 py-1.5 text-[12.5px] font-bold transition-colors',
                                    kindFilter === kind ? 'bg-card text-ink shadow-sm' : 'text-ink-faint hover:text-ink-muted'
                                )}
                            >
                                {kind === 'ALL' ? t('kindFilterAll') : t(`kinds.${kind}`)}
                            </button>
                        ))}
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
                                {status === 'ALL' ? t('status.ALL') : t(`status.${status}`)}
                            </button>
                        ))}
                    </div>
                    <p className="ml-auto shrink-0 text-xs font-semibold text-ink-faint">
                        {t('rowCount', { shown: visibleServices.length, total: allServices.length })}
                    </p>
                </div>

                {servicesQuery.isLoading && <p className="px-4 py-6 text-sm text-ink-muted">{t('loading')}</p>}
                {servicesQuery.error && (
                    <p className="px-4 py-6 text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(servicesQuery.error)}`)}</p>
                )}
                {!servicesQuery.isLoading && !servicesQuery.error && visibleServices.length === 0 && (
                    <p className="px-4 py-6 text-sm text-ink-muted">{t('empty')}</p>
                )}

                {!servicesQuery.isLoading && !servicesQuery.error && visibleServices.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[720px] border-collapse text-sm">
                            <thead>
                                <tr className="border-b border-border text-left text-[11px] font-bold uppercase tracking-wide text-ink-faint">
                                    <th className="px-4 py-2.5 font-bold">{t('columns.service')}</th>
                                    <th className="px-3 py-2.5 font-bold">{t('columns.kind')}</th>
                                    <th className="px-3 py-2.5 font-bold">{t('columns.price')}</th>
                                    <th className="px-3 py-2.5 font-bold">{t('columns.plans')}</th>
                                    <th className="px-3 py-2.5 font-bold">{t('columns.status')}</th>
                                    <th className="px-3 py-2.5" />
                                </tr>
                            </thead>
                            <tbody>
                                {visibleServices.map((service) => {
                                    const status = visibilityOf(service);
                                    const planNames =
                                        service.planTierIds.length === 0
                                            ? t('allPlans')
                                            : service.planTierIds.map((id) => plansById.get(id) ?? id).join(', ');
                                    return (
                                        <tr key={service.id} className="border-b border-border last:border-b-0 hover:bg-canvas/60">
                                            <td className="max-w-64 px-4 py-2.5">
                                                <p className="truncate font-semibold text-ink">{service.name}</p>
                                                <p className="truncate font-mono text-[11px] text-ink-faint">{service.code}</p>
                                            </td>
                                            <td className="px-3 py-2.5 text-ink-muted">{t(`kinds.${service.kind}`)}</td>
                                            <td className="px-3 py-2.5">
                                                <p className="font-mono text-ink">
                                                    {formatMoney(locale, service.priceAmountMinor, service.priceCurrency)}
                                                </p>
                                                <p className="text-[11px] text-ink-faint">
                                                    {service.billingPeriod === 'ONE_TIME'
                                                        ? t('fields.billingPeriodOnceShort')
                                                        : t('fields.billingPeriodMonthlyShort')}
                                                </p>
                                            </td>
                                            <td className="max-w-56 truncate px-3 py-2.5 text-ink-muted" title={planNames}>
                                                {planNames}
                                            </td>
                                            <td className="px-3 py-2.5">
                                                <span
                                                    className={cn(
                                                        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold',
                                                        STATUS_PILL[status]
                                                    )}
                                                >
                                                    <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[status])} />
                                                    {t(`status.${status}`)}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2.5 text-right">
                                                <button
                                                    type="button"
                                                    data-service-id={service.id}
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

            <PaidServiceDrawer
                key={selectedService?.id ?? 'new'}
                open={drawerOpen}
                service={selectedService}
                services={allServices}
                eventPlans={eventPlans.data ?? []}
                onCloseAction={closeDrawer}
            />

            <div className="mt-7">
                <AdminSection title={t('removeAddon.title')} description={t('removeAddon.subtitle')}>
                    <form onSubmit={handleRemoveSubmit} className="grid max-w-3xl gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
                        <AdminField label={t('removeAddon.eventId')} required>
                            <input
                                required
                                value={eventId}
                                onChange={handleEventIdChange}
                                spellCheck={false}
                                aria-invalid={showIdError}
                                placeholder={tAdmin('lifecycle.eventIdPlaceholder')}
                                className={adminInputClass('font-mono')}
                            />
                        </AdminField>
                        <AdminField label={t('removeAddon.code')} required>
                            <select
                                required
                                value={addonCode}
                                onChange={handleAddonCodeChange}
                                disabled={allServices.length === 0}
                                className={adminInputClass()}
                            >
                                {allServices.map((service) => (
                                    <option key={service.id} value={service.code}>
                                        {service.name}
                                    </option>
                                ))}
                            </select>
                        </AdminField>
                        <button
                            type="submit"
                            disabled={removeAddon.isPending || !canRemove}
                            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white disabled:opacity-40"
                        >
                            <PackageMinus className="h-4 w-4" />
                            {t('removeAddon.action')}
                        </button>
                    </form>
                    {eventTitle ? (
                        <p className="mt-2 text-sm font-semibold text-ink">{tAdmin('lifecycle.resolvedEvent', { title: eventTitle })}</p>
                    ) : (
                        <p className="mt-2 max-w-2xl text-xs leading-5 text-ink-muted">{tAdmin('lifecycle.idSourceHint')}</p>
                    )}
                    {showIdError && <p className="mt-1 text-xs font-semibold text-status-danger">{tAdmin('lifecycle.idInvalid')}</p>}
                    <p className="mt-2 max-w-2xl text-xs leading-5 text-status-warn">{t('removeAddon.activeWarning')}</p>
                    {removeAddon.isSuccess && <p className="mt-2 text-sm text-status-good">{t('removeAddon.success')}</p>}
                    {removeAddon.error && <p className="mt-2 text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(removeAddon.error)}`)}</p>}
                </AdminSection>
            </div>

            <ConfirmActionModal
                open={confirmRemoveOpen}
                onCloseAction={closeRemoveConfirm}
                title={t('removeAddon.confirmTitle', { service: selectedAddon?.name ?? addonCode })}
                body={
                    <>
                        <p>{t('removeAddon.confirmBody', { service: selectedAddon?.name ?? addonCode, event: eventTitle ?? trimmedId })}</p>
                        <p className="mt-2 break-all font-mono text-xs text-ink-faint">{trimmedId}</p>
                    </>
                }
                cancelLabel={tAdmin('cancel')}
                confirmLabel={t('removeAddon.action')}
                isConfirming={removeAddon.isPending}
                onConfirmAction={confirmRemove}
            />
        </div>
    );
}
