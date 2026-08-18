'use client';

import { useCreate, useDelete, useUpdate } from '@refinedev/core';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ChangeEvent, type FormEvent, useState } from 'react';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { VisibilitySegmentedControl } from '@/components/admin/VisibilitySegmentedControl';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { useAdminPlatformModules } from '@/hooks/useAdmin';
import { appConfigKeys } from '@/hooks/useAppConfig';
import { codeFromName, priceInputToMinor, priceMinorToInput, STORAGE_UNITS, storageBytesToInput, storageInputToBytes } from '@/lib/adminPlanForm';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import { type Visibility, visibilityFlags, visibilityOf } from '@/lib/adminVisibility';
import type { BillingPeriod, PaidServiceKind, PaidServiceRequestDto, PaidServiceResponseDto, PlanTierResponseDto } from '@/lib/api/types';

export type { Visibility } from '@/lib/adminVisibility';
export { visibilityOf } from '@/lib/adminVisibility';

// Enforced against `kind` server-side too: the two storage-bearing kinds cost money for
// as long as they're held, so they're pinned to MONTHLY. A MODULE_UNLOCK doesn't, so it's
// the one kind that can be sold outright — the admin form offers a real picker only there.
function billingPeriodInput(formData: FormData, kind: PaidServiceKind): BillingPeriod {
    if (kind !== 'MODULE_UNLOCK') return 'MONTHLY';
    return formData.get('billingPeriod') === 'ONE_TIME' ? 'ONE_TIME' : 'MONTHLY';
}

function serviceInput(
    formData: FormData,
    visibility: Visibility,
    takenCodes: string[],
    existing?: PaidServiceResponseDto
): PaidServiceRequestDto {
    const kind = (existing?.kind ?? formData.get('kind')) as PaidServiceKind;
    const name = String(formData.get('name') ?? '').trim();
    const flags = visibilityFlags(visibility);

    return {
        // The code is a wire identifier, not admin-facing input: it is derived from
        // the name once, at creation, and is immutable afterwards.
        code: existing?.code ?? (codeFromName(name, takenCodes) || codeFromName('service', takenCodes)),
        kind,
        name,
        description: String(formData.get('description') ?? '').trim() || null,
        sortOrder: Number(formData.get('sortOrder') ?? 0),
        isAssignable: flags.isAssignable,
        isPublic: flags.isPublic,
        // Prices are typed in euros and storage in GB; the wire format stays
        // minor units and bytes.
        priceAmountMinor: priceInputToMinor(formData.get('price')) ?? 0,
        priceCurrency: String(formData.get('priceCurrency') ?? '')
            .trim()
            .toUpperCase(),
        billingPeriod: billingPeriodInput(formData, kind),
        grantsStorageBytes: kind === 'STORAGE_PACK' ? storageInputToBytes(formData.get('storageAmount'), formData.get('storageUnit')) : null,
        grantsModuleKey: kind === 'MODULE_UNLOCK' ? String(formData.get('grantsModuleKey') ?? '') : null,
        planTierIds: formData.has('allEventPlans') ? [] : formData.getAll('planTierIds').map(String).filter(Boolean),
    };
}

export function PaidServiceDrawer({
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
    const queryClient = useQueryClient();
    const invalidateAppConfig = () => {
        queryClient.invalidateQueries({ queryKey: appConfigKeys.all });
    };

    const { mutateAsync: createService, mutation: createMutation } = useCreate<PaidServiceResponseDto>({
        mutationOptions: { onSuccess: invalidateAppConfig },
    });
    const { mutateAsync: updateService, mutation: updateMutation } = useUpdate<PaidServiceResponseDto>({
        mutationOptions: { onSuccess: invalidateAppConfig },
    });
    // useDelete's mutationOptions doesn't expose onSuccess, unlike useCreate/useUpdate — invalidate manually after it resolves.
    const { mutateAsync: deleteService, mutation: deleteMutation } = useDelete<PaidServiceResponseDto>();
    const modules = useAdminPlatformModules();

    const [selectedKind, setSelectedKind] = useState<PaidServiceKind>(service?.kind ?? 'STORAGE_PACK');
    const [visibility, setVisibility] = useState<Visibility>(service ? visibilityOf(service) : 'LIVE');
    const [deleteOpen, setDeleteOpen] = useState(false);

    const mutation = service ? updateMutation : createMutation;
    const displayedKind = service?.kind ?? selectedKind;
    const initialStorage = storageBytesToInput(service?.grantsStorageBytes ?? null);

    function handleKindChange(event: ChangeEvent<HTMLSelectElement>) {
        setSelectedKind(event.target.value as PaidServiceKind);
    }

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const input = serviceInput(
            new FormData(event.currentTarget),
            visibility,
            services.map((item) => item.code),
            service ?? undefined
        );

        if (service) {
            const { code: _code, kind: _kind, ...patch } = input;
            await updateService({ resource: 'paid-services', id: service.id, values: patch });
        } else {
            await createService({ resource: 'paid-services', values: input });
        }
        onClose();
    }

    async function confirmDelete() {
        if (!service) return;
        await deleteService({ resource: 'paid-services', id: service.id });
        invalidateAppConfig();
        onClose();
    }

    function openDeleteConfirmation() {
        setDeleteOpen(true);
    }

    function closeDeleteConfirmation() {
        setDeleteOpen(false);
    }

    return (
        <>
            <AdminDrawer
                open={open}
                onClose={onClose}
                closeLabel={tAdmin('cancel')}
                title={service ? t('editTitle', { name: service.name }) : t('createTitle')}
                subtitle={service ? t('editSubtitle') : t('createSubtitle')}
                footer={
                    <>
                        <div>
                            {service && (
                                <button
                                    type="button"
                                    onClick={openDeleteConfirmation}
                                    className="inline-flex min-h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold text-status-danger hover:bg-status-danger-wash"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    {t('delete')}
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="min-h-9 rounded-md border border-border px-3.5 text-sm font-semibold text-ink-muted"
                            >
                                {tAdmin('cancel')}
                            </button>
                            <button
                                type="submit"
                                form="paid-service-form"
                                disabled={mutation.isPending}
                                className="inline-flex min-h-9 items-center gap-2 rounded-md bg-ink px-3.5 text-sm font-semibold text-white disabled:opacity-50"
                            >
                                {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                                {service ? t('save') : t('create')}
                            </button>
                        </div>
                    </>
                }
            >
                <form id="paid-service-form" onSubmit={submit} className="space-y-5">
                    <AdminField label={t('fields.name')} required>
                        <input name="name" required maxLength={100} defaultValue={service?.name} className={adminInputClass()} />
                    </AdminField>

                    <div className="grid grid-cols-2 gap-3">
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
                    </div>

                    <AdminField label={t('fields.description')} optional>
                        <input name="description" defaultValue={service?.description ?? ''} className={adminInputClass()} />
                    </AdminField>

                    <div className="grid grid-cols-2 gap-3">
                        <AdminField
                            label={t('fields.price')}
                            required
                            hint={displayedKind === 'MODULE_UNLOCK' ? t('fields.priceHintUnlock') : t('fields.priceHint')}
                        >
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
                    </div>

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
                            <select name="grantsModuleKey" required defaultValue={service?.grantsModuleKey ?? ''} className={adminInputClass()}>
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

                    {displayedKind === 'MODULE_UNLOCK' && (
                        <AdminField label={t('fields.billingPeriod')} required hint={t('fields.billingPeriodHint')}>
                            <select name="billingPeriod" defaultValue={service?.billingPeriod ?? 'MONTHLY'} className={adminInputClass()}>
                                <option value="MONTHLY">{t('fields.billingPeriodMonthly')}</option>
                                <option value="ONE_TIME">{t('fields.billingPeriodOnce')}</option>
                            </select>
                        </AdminField>
                    )}

                    {service?.kind === 'MODULE_UNLOCK' && <p className="text-xs leading-5 text-status-warn">{t('moduleChangeWarning')}</p>}

                    <fieldset className="border-t border-border pt-4">
                        <legend className="mb-2 text-sm font-bold text-ink">{t('fields.availablePlans')}</legend>
                        <p className="mb-2 text-xs leading-5 text-ink-faint">{t('fields.availablePlansHint')}</p>
                        <label className="mb-2 flex min-h-10 items-center gap-3 rounded-md bg-surface-muted px-3 py-2 text-sm font-semibold text-ink-muted">
                            <input
                                type="checkbox"
                                name="allEventPlans"
                                defaultChecked={!service || service.planTierIds.length === 0}
                                className="h-4 w-4 accent-primary"
                            />
                            <span>{t('fields.allEventPlans')}</span>
                        </label>
                        <div className="space-y-1.5">
                            {eventPlans.map((plan) => (
                                <label
                                    key={plan.id}
                                    className="flex min-h-10 items-center gap-3 rounded-md border border-border px-3 py-2 text-sm font-semibold text-ink-muted"
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
                        {eventPlans.length === 0 && <p className="text-xs text-ink-faint">{t('fields.noEventPlans')}</p>}
                    </fieldset>

                    <VisibilitySegmentedControl
                        title={t('fields.visibility')}
                        value={visibility}
                        onChange={setVisibility}
                        labels={{ LIVE: t('fields.visibilityLive'), HIDDEN: t('fields.visibilityHidden'), ARCHIVED: t('fields.visibilityArchived') }}
                        hints={{
                            LIVE: t('fields.visibilityLiveHint'),
                            HIDDEN: t('fields.visibilityHiddenHint'),
                            ARCHIVED: t('fields.visibilityArchivedHint'),
                        }}
                    />

                    {mutation.error && <p className="text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(mutation.error)}`)}</p>}
                </form>
            </AdminDrawer>

            <ConfirmActionModal
                open={deleteOpen}
                onClose={closeDeleteConfirmation}
                title={t('deleteConfirmTitle', { name: service?.name ?? '' })}
                body={t('deleteConfirmBody')}
                cancelLabel={tAdmin('cancel')}
                confirmLabel={t('delete')}
                onConfirm={confirmDelete}
                isConfirming={deleteMutation.isPending}
                icon={<Trash2 className="h-5 w-5" />}
            />
        </>
    );
}
