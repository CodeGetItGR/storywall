'use client';

import { Loader2, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { AdminSection } from '@/components/admin/AdminSection';
import {
    useAdminPaidServices,
    useCreatePaidService,
    useDeletePaidService,
    useRemoveEventAddon,
    useUpdatePaidService,
} from '@/hooks/useAdmin';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { PaidServiceKind, PaidServiceRequestDto, PaidServiceResponseDto } from '@/lib/api/types';

function serviceInput(formData: FormData, existing?: PaidServiceResponseDto): PaidServiceRequestDto {
    const kind = (existing?.kind ?? formData.get('kind')) as PaidServiceKind;
    return {
        code: existing?.code ?? String(formData.get('code') ?? '').trim().toUpperCase(),
        kind,
        name: String(formData.get('name') ?? '').trim(),
        description: String(formData.get('description') ?? '').trim() || null,
        sortOrder: Number(formData.get('sortOrder') ?? 0),
        isAssignable: formData.has('isAssignable'),
        isPublic: formData.has('isPublic'),
        priceAmountMinor: Number(formData.get('priceAmountMinor') ?? 0),
        priceCurrency: String(formData.get('priceCurrency') ?? '').trim().toUpperCase(),
        billingPeriod: kind === 'STORAGE_PACK' ? 'ONE_TIME' : 'MONTHLY',
        grantsStorageBytes: kind === 'STORAGE_PACK' ? Number(formData.get('grantsStorageBytes') ?? 0) : null,
        planTierIds: String(formData.get('planTierIds') ?? '')
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean),
    };
}

function PaidServiceForm({ service }: { service?: PaidServiceResponseDto }) {
    const t = useTranslations('AdminPage.paidServices');
    const createService = useCreatePaidService();
    const updateService = useUpdatePaidService();
    const deleteService = useDeletePaidService();
    const mutation = service ? updateService : createService;

    async function submit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        const input = serviceInput(new FormData(event.currentTarget), service);
        if (service) {
            const { code: _code, kind: _kind, ...patch } = input;
            await updateService.mutateAsync({ id: service.id, input: patch });
        } else {
            await createService.mutateAsync(input);
            event.currentTarget.reset();
        }
    }

    function deleteCurrentService() {
        if (service) deleteService.mutate(service.id);
    }

    return (
        <form onSubmit={submit} className="grid gap-3 border-b border-border py-4 first:pt-0 lg:grid-cols-4">
            <AdminField label={t('fields.code')} required>
                <input name="code" required maxLength={30} pattern="[A-Z0-9_]+" defaultValue={service?.code} disabled={Boolean(service)} className={adminInputClass()} />
            </AdminField>
            <AdminField label={t('fields.kind')} required>
                <select name="kind" defaultValue={service?.kind ?? 'STORAGE_PACK'} disabled={Boolean(service)} className={adminInputClass()}>
                    <option value="STORAGE_PACK">{t('kinds.STORAGE_PACK')}</option>
                    <option value="RECURRING_ADDON">{t('kinds.RECURRING_ADDON')}</option>
                </select>
            </AdminField>
            <AdminField label={t('fields.name')} required>
                <input name="name" required defaultValue={service?.name} className={adminInputClass()} />
            </AdminField>
            <AdminField label={t('fields.sortOrder')} required>
                <input name="sortOrder" type="number" required defaultValue={service?.sortOrder ?? 0} className={adminInputClass()} />
            </AdminField>
            <AdminField label={t('fields.description')} optional className="lg:col-span-2">
                <input name="description" defaultValue={service?.description ?? ''} className={adminInputClass()} />
            </AdminField>
            <AdminField label={t('fields.priceAmountMinor')} required>
                <input name="priceAmountMinor" type="number" min={0} required defaultValue={service?.priceAmountMinor ?? 0} className={adminInputClass()} />
            </AdminField>
            <AdminField label={t('fields.priceCurrency')} required>
                <input name="priceCurrency" required maxLength={3} defaultValue={service?.priceCurrency ?? 'EUR'} className={adminInputClass()} />
            </AdminField>
            <AdminField label={t('fields.grantsStorageBytes')} optional>
                <input name="grantsStorageBytes" type="number" min={1} defaultValue={service?.grantsStorageBytes ?? ''} className={adminInputClass()} />
            </AdminField>
            <AdminField label={t('fields.planTierIds')} optional className="lg:col-span-2">
                <input name="planTierIds" defaultValue={service?.planTierIds.join(', ') ?? ''} placeholder={t('fields.planTierIdsHint')} className={adminInputClass()} />
            </AdminField>
            <div className="flex items-end gap-4 pb-2 text-xs font-semibold text-ink-muted">
                <label><input name="isAssignable" type="checkbox" defaultChecked={service?.isAssignable ?? true} className="mr-1 accent-primary" />{t('fields.assignable')}</label>
                <label><input name="isPublic" type="checkbox" defaultChecked={service?.isPublic ?? true} className="mr-1 accent-primary" />{t('fields.public')}</label>
            </div>
            <div className="flex items-end gap-2 lg:col-span-4">
                <button type="submit" disabled={mutation.isPending} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white disabled:opacity-50">
                    {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}{service ? t('save') : t('create')}
                </button>
                {service && (
                    <button type="button" onClick={deleteCurrentService} disabled={deleteService.isPending} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border px-4 text-sm font-semibold text-rose-700 disabled:opacity-50">
                        <Trash2 className="h-4 w-4" />{t('delete')}
                    </button>
                )}
            </div>
            {(mutation.error || deleteService.error) && <p className="text-xs text-rose-600 lg:col-span-4">{t(`errors.${adminErrorMessageKey(mutation.error ?? deleteService.error)}`)}</p>}
        </form>
    );
}

export function PaidServicesCatalogPanel() {
    const t = useTranslations('AdminPage.paidServices');
    const [includeArchived, setIncludeArchived] = useState(true);
    const [eventId, setEventId] = useState('');
    const [addonCode, setAddonCode] = useState('ORIGINALS');
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

    return (
        <div className="space-y-7">
            <AdminSection title={t('title')} description={t('subtitle')}>
                <label className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-ink-muted">
                    <input type="checkbox" checked={includeArchived} onChange={handleArchivedChange} className="accent-primary" />
                    {t('includeArchived')}
                </label>
                <PaidServiceForm />
                {services.isLoading && <p className="py-4 text-sm text-ink-muted">{t('loading')}</p>}
                {services.data?.map((service) => <PaidServiceForm key={service.id} service={service} />)}
            </AdminSection>
            <AdminSection title={t('removeAddon.title')} description={t('removeAddon.subtitle')}>
                <form onSubmit={remove} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                    <input required value={eventId} onChange={handleEventIdChange} placeholder={t('removeAddon.eventId')} className={adminInputClass()} />
                    <input required value={addonCode} onChange={handleAddonCodeChange} placeholder={t('removeAddon.code')} className={adminInputClass()} />
                    <button type="submit" disabled={removeAddon.isPending} className="rounded-md bg-ink px-4 text-sm font-semibold text-white disabled:opacity-50">{t('removeAddon.action')}</button>
                </form>
                {removeAddon.isSuccess && <p className="mt-2 text-xs text-emerald-700">{t('removeAddon.success')}</p>}
                {removeAddon.error && <p className="mt-2 text-xs text-rose-600">{t(`errors.${adminErrorMessageKey(removeAddon.error)}`)}</p>}
            </AdminSection>
        </div>
    );
}
