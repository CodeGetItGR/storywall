'use client';

import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { adminInputClass } from '@/components/admin/AdminField';
import { AdminSection } from '@/components/admin/AdminSection';
import { PaidServiceDialog } from '@/components/admin/PaidServiceDialog';
import { PaidServiceRow } from '@/components/admin/PaidServiceRow';
import { useAdminPaidServices, useRemoveEventAddon } from '@/hooks/useAdmin';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { PaidServiceResponseDto } from '@/lib/api/types';

export function PaidServicesCatalogPanel() {
    const t = useTranslations('AdminPage.paidServices');
    const [includeArchived, setIncludeArchived] = useState(true);
    const [eventId, setEventId] = useState('');
    const [addonCode, setAddonCode] = useState('ORIGINALS');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedService, setSelectedService] = useState<PaidServiceResponseDto | null>(null);
    const services = useAdminPaidServices(undefined, includeArchived);
    const removeAddon = useRemoveEventAddon();

    function remove(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        removeAddon.mutate({ eventId: eventId.trim(), code: addonCode.trim().toUpperCase() });
    }

    function handleArchivedChange(event: React.ChangeEvent<HTMLInputElement>) {
        setIncludeArchived(event.target.checked);
    }

    function handleEventIdChange(event: React.ChangeEvent<HTMLInputElement>) {
        setEventId(event.target.value);
    }

    function handleAddonCodeChange(event: React.ChangeEvent<HTMLInputElement>) {
        setAddonCode(event.target.value);
    }

    function openCreate() {
        setSelectedService(null);
        setDialogOpen(true);
    }

    function openEdit(service: PaidServiceResponseDto) {
        setSelectedService(service);
        setDialogOpen(true);
    }

    function closeDialog() {
        setDialogOpen(false);
        setSelectedService(null);
    }

    return (
        <div className="space-y-7">
            <AdminSection title={t('title')} description={t('subtitle')}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
                    <label className="inline-flex items-center gap-2 text-sm font-semibold text-ink-muted">
                        <input type="checkbox" checked={includeArchived} onChange={handleArchivedChange} className="h-4 w-4 accent-primary" />
                        {t('includeArchived')}
                    </label>
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
                {!services.isLoading && !services.error && services.data?.length === 0 && <p className="py-5 text-sm text-ink-muted">{t('empty')}</p>}
                {services.data?.map((service) => (
                    <PaidServiceRow key={service.id} service={service} onEdit={openEdit} />
                ))}
                <PaidServiceDialog open={dialogOpen} service={selectedService} onClose={closeDialog} />
            </AdminSection>
            <AdminSection title={t('removeAddon.title')} description={t('removeAddon.subtitle')}>
                <form onSubmit={remove} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                    <input
                        required
                        value={eventId}
                        onChange={handleEventIdChange}
                        placeholder={t('removeAddon.eventId')}
                        className={adminInputClass()}
                    />
                    <input
                        required
                        value={addonCode}
                        onChange={handleAddonCodeChange}
                        placeholder={t('removeAddon.code')}
                        className={adminInputClass()}
                    />
                    <button
                        type="submit"
                        disabled={removeAddon.isPending}
                        className="rounded-md bg-ink px-4 text-sm font-semibold text-white disabled:opacity-50"
                    >
                        {t('removeAddon.action')}
                    </button>
                </form>
                {removeAddon.isSuccess && <p className="mt-2 text-xs text-emerald-700">{t('removeAddon.success')}</p>}
                {removeAddon.error && <p className="mt-2 text-xs text-rose-600">{t(`errors.${adminErrorMessageKey(removeAddon.error)}`)}</p>}
            </AdminSection>
        </div>
    );
}
