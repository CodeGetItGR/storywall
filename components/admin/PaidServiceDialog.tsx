'use client';

import { Loader2, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { Modal } from '@/components/ui/modal';
import { useCreatePaidService, useDeletePaidService, useUpdatePaidService } from '@/hooks/useAdmin';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { BillingPeriod, PaidServiceKind, PaidServiceRequestDto, PaidServiceResponseDto } from '@/lib/api/types';

const BILLING_PERIOD_BY_KIND: Record<PaidServiceKind, BillingPeriod> = {
    STORAGE_PACK: 'MONTHLY',
    RECURRING_ADDON: 'MONTHLY',
};

function serviceInput(formData: FormData, existing?: PaidServiceResponseDto): PaidServiceRequestDto {
    const kind = (existing?.kind ?? formData.get('kind')) as PaidServiceKind;

    return {
        code:
            existing?.code ??
            String(formData.get('code') ?? '')
                .trim()
                .toUpperCase(),
        kind,
        name: String(formData.get('name') ?? '').trim(),
        description: String(formData.get('description') ?? '').trim() || null,
        sortOrder: Number(formData.get('sortOrder') ?? 0),
        isAssignable: formData.has('isAssignable'),
        isPublic: formData.has('isPublic'),
        priceAmountMinor: Number(formData.get('priceAmountMinor') ?? 0),
        priceCurrency: String(formData.get('priceCurrency') ?? '')
            .trim()
            .toUpperCase(),
        billingPeriod: BILLING_PERIOD_BY_KIND[kind],
        grantsStorageBytes: kind === 'STORAGE_PACK' ? Number(formData.get('grantsStorageBytes') ?? 0) : null,
        planTierIds: String(formData.get('planTierIds') ?? '')
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean),
    };
}

export function PaidServiceDialog({ open, service, onClose }: { open: boolean; service: PaidServiceResponseDto | null; onClose: () => void }) {
    const t = useTranslations('AdminPage.paidServices');
    const tAdmin = useTranslations('AdminPage');
    const createService = useCreatePaidService();
    const updateService = useUpdatePaidService();
    const deleteService = useDeletePaidService();
    const [deleteOpen, setDeleteOpen] = useState(false);
    const mutation = service ? updateService : createService;

    function close() {
        createService.reset();
        updateService.reset();
        deleteService.reset();
        setDeleteOpen(false);
        onClose();
    }

    async function submit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        const input = serviceInput(new FormData(event.currentTarget), service ?? undefined);

        if (service) {
            const { code: _code, kind: _kind, ...patch } = input;
            await updateService.mutateAsync({ id: service.id, input: patch });
        } else {
            await createService.mutateAsync(input);
        }

        close();
    }

    async function confirmDelete() {
        if (!service) return;
        await deleteService.mutateAsync(service.id);
        close();
    }

    function openDeleteConfirmation() {
        setDeleteOpen(true);
    }

    function closeDeleteConfirmation() {
        setDeleteOpen(false);
    }

    return (
        <>
            <Modal open={open} onClose={close} size="lg" closeLabel={tAdmin('cancel')}>
                <Modal.Body className="px-4 pb-4 pt-12 sm:px-5">
                    <form key={service?.id ?? 'new'} onSubmit={submit} className="space-y-5">
                        <div className="pr-10">
                            <h2 className="text-lg font-semibold text-ink">{service ? t('editTitle', { code: service.code }) : t('createTitle')}</h2>
                            <p className="mt-1 text-sm leading-6 text-ink-muted">{service ? t('editSubtitle') : t('createSubtitle')}</p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <AdminField label={t('fields.code')} required>
                                <input
                                    name="code"
                                    required
                                    maxLength={30}
                                    pattern="[A-Z0-9_]+"
                                    defaultValue={service?.code}
                                    disabled={Boolean(service)}
                                    className={adminInputClass()}
                                />
                            </AdminField>
                            <AdminField label={t('fields.kind')} required>
                                <select
                                    name="kind"
                                    defaultValue={service?.kind ?? 'STORAGE_PACK'}
                                    disabled={Boolean(service)}
                                    className={adminInputClass()}
                                >
                                    <option value="STORAGE_PACK">{t('kinds.STORAGE_PACK')}</option>
                                    <option value="RECURRING_ADDON">{t('kinds.RECURRING_ADDON')}</option>
                                </select>
                            </AdminField>
                            <AdminField label={t('fields.name')} required>
                                <input name="name" required defaultValue={service?.name} className={adminInputClass()} />
                            </AdminField>
                            <AdminField label={t('fields.sortOrder')} required>
                                <input
                                    name="sortOrder"
                                    type="number"
                                    required
                                    min={0}
                                    defaultValue={service?.sortOrder ?? 0}
                                    className={adminInputClass()}
                                />
                            </AdminField>
                            <AdminField label={t('fields.description')} optional className="sm:col-span-2">
                                <input name="description" defaultValue={service?.description ?? ''} className={adminInputClass()} />
                            </AdminField>
                            <AdminField label={t('fields.priceAmountMinor')} required>
                                <input
                                    name="priceAmountMinor"
                                    type="number"
                                    min={0}
                                    required
                                    defaultValue={service?.priceAmountMinor ?? 0}
                                    className={adminInputClass()}
                                />
                            </AdminField>
                            <AdminField label={t('fields.priceCurrency')} required>
                                <input
                                    name="priceCurrency"
                                    required
                                    maxLength={3}
                                    defaultValue={service?.priceCurrency ?? 'EUR'}
                                    className={adminInputClass()}
                                />
                            </AdminField>
                            <AdminField label={t('fields.grantsStorageBytes')} optional>
                                <input
                                    name="grantsStorageBytes"
                                    type="number"
                                    min={1}
                                    defaultValue={service?.grantsStorageBytes ?? ''}
                                    className={adminInputClass()}
                                />
                            </AdminField>
                            <AdminField label={t('fields.planTierIds')} optional className="sm:col-span-2 lg:col-span-3">
                                <input
                                    name="planTierIds"
                                    defaultValue={service?.planTierIds.join(', ') ?? ''}
                                    placeholder={t('fields.planTierIdsHint')}
                                    className={adminInputClass()}
                                />
                            </AdminField>
                        </div>

                        <div className="flex flex-wrap gap-5 border-y border-border py-3 text-sm font-semibold text-ink-muted">
                            <label className="inline-flex items-center gap-2">
                                <input
                                    name="isAssignable"
                                    type="checkbox"
                                    defaultChecked={service?.isAssignable ?? true}
                                    className="h-4 w-4 accent-primary"
                                />
                                {t('fields.assignable')}
                            </label>
                            <label className="inline-flex items-center gap-2">
                                <input
                                    name="isPublic"
                                    type="checkbox"
                                    defaultChecked={service?.isPublic ?? true}
                                    className="h-4 w-4 accent-primary"
                                />
                                {t('fields.public')}
                            </label>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                {service && (
                                    <button
                                        type="button"
                                        onClick={openDeleteConfirmation}
                                        className="inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold text-rose-700 hover:bg-rose-50"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        {t('delete')}
                                    </button>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={close}
                                    className="min-h-10 rounded-md border border-border px-4 text-sm font-semibold text-ink-muted"
                                >
                                    {tAdmin('cancel')}
                                </button>
                                <button
                                    type="submit"
                                    disabled={mutation.isPending}
                                    className="inline-flex min-h-10 items-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white disabled:opacity-50"
                                >
                                    {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                                    {service ? t('save') : t('create')}
                                </button>
                            </div>
                        </div>

                        {mutation.error && <p className="text-sm text-rose-600">{t(`errors.${adminErrorMessageKey(mutation.error)}`)}</p>}
                    </form>
                </Modal.Body>
            </Modal>

            <ConfirmActionModal
                open={deleteOpen}
                onClose={closeDeleteConfirmation}
                title={t('deleteConfirmTitle', { code: service?.code ?? '' })}
                body={t('deleteConfirmBody')}
                cancelLabel={tAdmin('cancel')}
                confirmLabel={t('delete')}
                onConfirm={confirmDelete}
                isConfirming={deleteService.isPending}
                icon={<Trash2 className="h-5 w-5" />}
            />
        </>
    );
}
