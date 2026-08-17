'use client';

import { PackageMinus, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { type ChangeEvent, useCallback, useMemo, useState } from 'react';

import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { useAdminNavigation } from '@/components/admin/AdminNavigationContext';
import { AdminSection } from '@/components/admin/AdminSection';
import { PaidServiceDialog } from '@/components/admin/PaidServiceDialog';
import { PaidServiceRow } from '@/components/admin/PaidServiceRow';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { useAdminPaidServices, useAdminPlanTiers, useAdminPlatformModules, useRemoveEventAddon } from '@/hooks/useAdmin';
import { adminErrorMessageKey, isUuid } from '@/lib/adminUtils';
import type { PaidServiceKind, PaidServiceResponseDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

const KIND_FILTERS: Array<PaidServiceKind | 'ALL'> = ['ALL', 'STORAGE_PACK', 'RECURRING_ADDON', 'MODULE_UNLOCK'];

export function PaidServicesCatalogPanel() {
    const t = useTranslations('AdminPage.paidServices');
    const tAdmin = useTranslations('AdminPage');
    const { focus } = useAdminNavigation();
    const [includeArchived, setIncludeArchived] = useState(true);
    const [kindFilter, setKindFilter] = useState<PaidServiceKind | 'ALL'>('ALL');
    const [eventId, setEventId] = useState('');
    const [eventTitle, setEventTitle] = useState<string | null>(null);
    const [pickedAddonCode, setAddonCode] = useState('');
    const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedService, setSelectedService] = useState<PaidServiceResponseDto | null>(null);
    const [appliedFocus, setAppliedFocus] = useState(focus);
    const services = useAdminPaidServices(undefined, includeArchived);
    const eventPlans = useAdminPlanTiers('EVENT', true);
    const modules = useAdminPlatformModules();
    const removeAddon = useRemoveEventAddon();

    const allServices = useMemo(() => services.data ?? [], [services.data]);
    const visibleServices = useMemo(
        () => (kindFilter === 'ALL' ? allServices : allServices.filter((service) => service.kind === kindFilter)),
        [allServices, kindFilter]
    );

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

    const handleArchivedChange = useCallback((event: ChangeEvent<HTMLInputElement>) => setIncludeArchived(event.target.checked), []);
    const handleKindChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => setKindFilter(event.target.value as PaidServiceKind | 'ALL'), []);
    const handleAddonCodeChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => setAddonCode(event.target.value), []);

    const handleEventIdChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setEventId(event.target.value);
        setEventTitle(null);
    }, []);

    const openCreate = useCallback(() => {
        setSelectedService(null);
        setDialogOpen(true);
    }, []);

    const openEdit = useCallback((service: PaidServiceResponseDto) => {
        setSelectedService(service);
        setDialogOpen(true);
    }, []);

    const closeDialog = useCallback(() => {
        setDialogOpen(false);
        setSelectedService(null);
    }, []);

    const trimmedId = eventId.trim();
    const showIdError = trimmedId.length > 0 && !isUuid(trimmedId);
    const canRemove = isUuid(trimmedId) && Boolean(addonCode);
    const selectedAddon = allServices.find((service) => service.code === addonCode) ?? null;

    return (
        <div className="space-y-7">
            <AdminSection title={t('title')} description={t('subtitle')}>
                <div className="mb-3 flex flex-wrap items-end justify-between gap-3 border-b border-border pb-3">
                    <div className="flex flex-wrap items-end gap-4">
                        <AdminField label={t('fields.kind')}>
                            <select value={kindFilter} onChange={handleKindChange} className={adminInputClass('max-w-52')}>
                                {KIND_FILTERS.map((kind) => (
                                    <option key={kind} value={kind}>
                                        {kind === 'ALL' ? t('kindFilterAll') : t(`kinds.${kind}`)}
                                    </option>
                                ))}
                            </select>
                        </AdminField>
                        <label className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-ink-muted">
                            <input type="checkbox" checked={includeArchived} onChange={handleArchivedChange} className="h-4 w-4 accent-primary" />
                            {t('includeArchived')}
                        </label>
                    </div>
                    <button
                        type="button"
                        onClick={openCreate}
                        className="inline-flex min-h-10 items-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(36,31,26,0.14)]"
                    >
                        <Plus className="h-4 w-4" />
                        {t('create')}
                    </button>
                </div>
                {services.isLoading && <p className="py-4 text-sm text-ink-muted">{t('loading')}</p>}
                {services.error && <p className="py-4 text-sm text-rose-600">{t(`errors.${adminErrorMessageKey(services.error)}`)}</p>}
                {!services.isLoading && !services.error && visibleServices.length === 0 && <p className="py-5 text-sm text-ink-muted">{t('empty')}</p>}
                {visibleServices.map((service) => (
                    <PaidServiceRow
                        key={service.id}
                        service={service}
                        eventPlans={eventPlans.data ?? []}
                        modules={modules.data ?? []}
                        onEdit={openEdit}
                    />
                ))}
                <PaidServiceDialog
                    open={dialogOpen}
                    service={selectedService}
                    services={allServices}
                    eventPlans={eventPlans.data ?? []}
                    onClose={closeDialog}
                />
            </AdminSection>

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
                {showIdError && <p className="mt-1 text-xs font-semibold text-rose-600">{tAdmin('lifecycle.idInvalid')}</p>}
                <p className={cn('mt-2 max-w-2xl text-xs leading-5 text-amber-700')}>{t('removeAddon.activeWarning')}</p>
                {removeAddon.isSuccess && <p className="mt-2 text-sm text-emerald-700">{t('removeAddon.success')}</p>}
                {removeAddon.error && <p className="mt-2 text-sm text-rose-600">{t(`errors.${adminErrorMessageKey(removeAddon.error)}`)}</p>}
            </AdminSection>

            <ConfirmActionModal
                open={confirmRemoveOpen}
                onClose={closeRemoveConfirm}
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
                onConfirm={confirmRemove}
            />
        </div>
    );
}
