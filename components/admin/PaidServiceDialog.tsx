'use client';

import { Loader2, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { Modal } from '@/components/ui/modal';
import { useAdminPlatformModules, useCreatePaidService, useDeletePaidService, useUpdatePaidService } from '@/hooks/useAdmin';
import { codeFromName, priceInputToMinor, priceMinorToInput, STORAGE_UNITS, storageBytesToInput, storageInputToBytes } from '@/lib/adminPlanForm';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { BillingPeriod, PaidServiceKind, PaidServiceRequestDto, PaidServiceResponseDto, PlanTierResponseDto } from '@/lib/api/types';

const BILLING_PERIOD_BY_KIND: Record<PaidServiceKind, BillingPeriod> = {
    STORAGE_PACK: 'MONTHLY',
    RECURRING_ADDON: 'MONTHLY',
    MODULE_UNLOCK: 'MONTHLY',
};

function serviceInput(formData: FormData, takenCodes: string[], existing?: PaidServiceResponseDto): PaidServiceRequestDto {
    const kind = (existing?.kind ?? formData.get('kind')) as PaidServiceKind;
    const name = String(formData.get('name') ?? '').trim();

    return {
        // The code is a wire identifier, not admin-facing input: it is derived from
        // the name once, at creation, and is immutable afterwards.
        code: existing?.code ?? (codeFromName(name, takenCodes) || codeFromName('service', takenCodes)),
        kind,
        name,
        description: String(formData.get('description') ?? '').trim() || null,
        sortOrder: Number(formData.get('sortOrder') ?? 0),
        isAssignable: formData.has('isAssignable'),
        isPublic: formData.has('isPublic'),
        // Prices are typed in euros and storage in GB; the wire format stays
        // minor units and bytes.
        priceAmountMinor: priceInputToMinor(formData.get('price')) ?? 0,
        priceCurrency: String(formData.get('priceCurrency') ?? '')
            .trim()
            .toUpperCase(),
        billingPeriod: BILLING_PERIOD_BY_KIND[kind],
        grantsStorageBytes:
            kind === 'STORAGE_PACK' ? storageInputToBytes(formData.get('storageAmount'), formData.get('storageUnit')) : null,
        grantsModuleKey: kind === 'MODULE_UNLOCK' ? String(formData.get('grantsModuleKey') ?? '') : null,
        planTierIds: formData.has('allEventPlans') ? [] : formData.getAll('planTierIds').map(String).filter(Boolean),
    };
}

export function PaidServiceDialog({
    open,
    service,
    services,
    eventPlans,
    onClose,
}: {
    open: boolean;
    service: PaidServiceResponseDto | null;
    services: PaidServiceResponseDto[];
    eventPlans: PlanTierResponseDto[];
    onClose: () => void;
}) {
    const t = useTranslations('AdminPage.paidServices');
    const tAdmin = useTranslations('AdminPage');
    const createService = useCreatePaidService();
    const updateService = useUpdatePaidService();
    const deleteService = useDeletePaidService();
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [selectedKind, setSelectedKind] = useState<PaidServiceKind>(service?.kind ?? 'STORAGE_PACK');
    const modules = useAdminPlatformModules();
    const mutation = service ? updateService : createService;

    const displayedKind = service?.kind ?? selectedKind;
    const initialStorage = storageBytesToInput(service?.grantsStorageBytes ?? null);

    function handleKindChange(event: React.ChangeEvent<HTMLSelectElement>) {
        setSelectedKind(event.target.value as PaidServiceKind);
    }

    function close() {
        createService.reset();
        updateService.reset();
        deleteService.reset();
        setDeleteOpen(false);
        setSelectedKind('STORAGE_PACK');
        onClose();
    }

    async function submit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        const input = serviceInput(
            new FormData(event.currentTarget),
            services.map((item) => item.code),
            service ?? undefined
        );

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
                            <h2 className="text-lg font-semibold text-ink">{service ? t('editTitle', { name: service.name }) : t('createTitle')}</h2>
                            <p className="mt-1 text-sm leading-6 text-ink-muted">{service ? t('editSubtitle') : t('createSubtitle')}</p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                            <AdminField label={t('fields.name')} required className="sm:col-span-2">
                                <input name="name" required maxLength={100} defaultValue={service?.name} className={adminInputClass()} />
                            </AdminField>
                            <AdminField label={t('fields.kind')} required>
                                <select
                                    name="kind"
                                    defaultValue={service?.kind ?? 'STORAGE_PACK'}
                                    disabled={Boolean(service)}
                                    onChange={handleKindChange}
                                    className={adminInputClass()}
                                >
                                    <option value="STORAGE_PACK">{t('kinds.STORAGE_PACK')}</option>
                                    <option value="RECURRING_ADDON">{t('kinds.RECURRING_ADDON')}</option>
                                    <option value="MODULE_UNLOCK">{t('kinds.MODULE_UNLOCK')}</option>
                                </select>
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
                            <AdminField label={t('fields.description')} optional className="sm:col-span-2 md:col-span-4">
                                <input name="description" defaultValue={service?.description ?? ''} className={adminInputClass()} />
                            </AdminField>
                            <AdminField label={t('fields.price')} required hint={t('fields.priceHint')}>
                                <input
                                    name="price"
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    required
                                    defaultValue={priceMinorToInput(service?.priceAmountMinor ?? 0)}
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
                            {displayedKind === 'STORAGE_PACK' && (
                                <AdminField label={t('fields.grantsStorage')} required>
                                    <div className="flex gap-2">
                                        <input
                                            name="storageAmount"
                                            type="number"
                                            min={1}
                                            step="any"
                                            required
                                            defaultValue={initialStorage.amount}
                                            className={adminInputClass('w-full')}
                                        />
                                        <select name="storageUnit" defaultValue={initialStorage.unit} className={adminInputClass('w-24 shrink-0')}>
                                            {STORAGE_UNITS.map((unit) => (
                                                <option key={unit} value={unit}>
                                                    {unit}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </AdminField>
                            )}
                            {displayedKind === 'MODULE_UNLOCK' && (
                                <AdminField label={t('fields.grantsModuleKey')} required>
                                    <select
                                        name="grantsModuleKey"
                                        required
                                        defaultValue={service?.grantsModuleKey ?? ''}
                                        className={adminInputClass()}
                                    >
                                        <option value="" disabled>
                                            {t('fields.selectModule')}
                                        </option>
                                        {modules.data?.map((module_) => (
                                            <option key={module_.moduleKey} value={module_.moduleKey}>
                                                {module_.name}
                                            </option>
                                        ))}
                                    </select>
                                </AdminField>
                            )}
                            {service?.kind === 'MODULE_UNLOCK' && (
                                <p className="self-end text-xs leading-5 text-amber-700 sm:col-span-2 md:col-span-4">{t('moduleChangeWarning')}</p>
                            )}
                        </div>

                        <fieldset className="border-y border-border py-3">
                            <legend className="mb-2 text-sm font-semibold text-ink">{t('fields.availablePlans')}</legend>
                            <p className="mb-2 text-xs leading-5 text-ink-muted">{t('fields.availablePlansHint')}</p>
                            <label className="mb-2 flex min-h-11 items-center gap-3 rounded-md bg-surface-muted/70 px-3 py-2 text-sm font-semibold text-ink-muted">
                                <input
                                    type="checkbox"
                                    name="allEventPlans"
                                    defaultChecked={!service || service.planTierIds.length === 0}
                                    className="h-4 w-4 accent-primary"
                                />
                                <span>{t('fields.allEventPlans')}</span>
                            </label>
                            <div className="grid gap-2 sm:grid-cols-2">
                                {eventPlans.map((plan) => (
                                    <label
                                        key={plan.id}
                                        className="flex min-h-11 items-center gap-3 rounded-md border border-border/70 px-3 py-2 text-sm font-semibold text-ink-muted"
                                    >
                                        <input
                                            type="checkbox"
                                            name="planTierIds"
                                            value={plan.id}
                                            defaultChecked={service?.planTierIds.includes(plan.id) ?? false}
                                            className="h-4 w-4 accent-primary"
                                        />
                                        <span className="min-w-0 truncate text-ink">{plan.name}</span>
                                    </label>
                                ))}
                            </div>
                            {eventPlans.length === 0 && <p className="text-xs text-ink-muted">{t('fields.noEventPlans')}</p>}
                        </fieldset>

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
                title={t('deleteConfirmTitle', { name: service?.name ?? '' })}
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
