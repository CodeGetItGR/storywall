'use client';

import { Check, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useState } from 'react';

import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { useAdminPlatformModules, useUpdatePlatformModule } from '@/hooks/useAdmin';
import { adminErrorMessageKey, checked, emptyToNull } from '@/lib/adminUtils';
import type { PlatformModulePatchDto, PlatformModuleResponseDto } from '@/lib/api/types';

type PendingModuleUpdate = {
    moduleKey: string;
    input: PlatformModulePatchDto;
};

function ModuleRow({ module }: { module: PlatformModuleResponseDto }) {
    const t = useTranslations('AdminPage');
    const updateModule = useUpdatePlatformModule();
    const [pendingUpdate, setPendingUpdate] = useState<PendingModuleUpdate | null>(null);

    function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        setPendingUpdate({
            moduleKey: module.moduleKey,
            input: {
                name: String(formData.get('name') ?? '').trim(),
                description: emptyToNull(formData.get('description')),
                sortOrder: Number(formData.get('sortOrder') ?? module.sortOrder),
                isEnabled: checked(formData, 'isEnabled'),
            },
        });
    }

    function handleConfirmClose() {
        setPendingUpdate(null);
    }

    async function handleConfirmUpdate() {
        if (!pendingUpdate) return;
        await updateModule.mutateAsync(pendingUpdate);
        setPendingUpdate(null);
    }

    return (
        <>
            <form
                onSubmit={handleSubmit}
                className="grid gap-3 border-b border-border py-4 md:grid-cols-[minmax(10rem,0.9fr)_minmax(14rem,1.25fr)_5.5rem_auto] md:items-end md:gap-4"
            >
                <AdminField label={module.moduleKey} required>
                    <input name="name" required maxLength={100} defaultValue={module.name} className={adminInputClass()} />
                </AdminField>
                <AdminField label={t('fields.description')} optional>
                    <input name="description" defaultValue={module.description ?? ''} className={adminInputClass()} />
                </AdminField>
                <AdminField label={t('fields.sort')} optional>
                    <input name="sortOrder" type="number" min={0} defaultValue={module.sortOrder} className={adminInputClass()} />
                </AdminField>
                <div className="flex items-center justify-between gap-3 md:justify-end">
                    <label className="inline-flex items-center gap-2 text-sm font-medium text-ink-muted">
                        <input type="checkbox" name="isEnabled" defaultChecked={module.isEnabled} className="h-4 w-4 accent-primary" />
                        <span>
                            {t('modules.enabled')} <span className="text-ink-faint">(optional)</span>
                        </span>
                    </label>
                    <button
                        type="submit"
                        disabled={updateModule.isPending}
                        className="inline-flex min-h-9 items-center gap-2 rounded-full bg-ink px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
                    >
                        {updateModule.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        {t('save')}
                    </button>
                </div>
                {updateModule.error && <p className="text-sm text-rose-600 md:col-span-4">{t(`errors.${adminErrorMessageKey(updateModule.error)}`)}</p>}
            </form>
            <ConfirmActionModal
                open={Boolean(pendingUpdate)}
                onClose={handleConfirmClose}
                title={t('modules.confirmTitle', { module: module.moduleKey })}
                body={t('modules.confirmBody')}
                cancelLabel={t('cancel')}
                confirmLabel={t('save')}
                isConfirming={updateModule.isPending}
                onConfirm={handleConfirmUpdate}
                tone="default"
            />
        </>
    );
}

export function ModuleRegistryPanel() {
    const t = useTranslations('AdminPage');
    const modulesQuery = useAdminPlatformModules();
    const modules = [...(modulesQuery.data ?? [])].sort((left, right) => left.sortOrder - right.sortOrder);

    return (
        <section className="space-y-3">
            <div className="border-b border-amber-200 pb-3 text-sm text-amber-800">{t('modules.notice')}</div>
            {modulesQuery.isLoading && <p className="text-sm text-ink-muted">{t('modules.loading')}</p>}
            {modulesQuery.error && <p className="text-sm text-rose-600">{t(`errors.${adminErrorMessageKey(modulesQuery.error)}`)}</p>}
            {modules.map((module) => (
                <ModuleRow key={module.moduleKey} module={module} />
            ))}
        </section>
    );
}
