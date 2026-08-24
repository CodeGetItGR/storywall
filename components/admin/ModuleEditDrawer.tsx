'use client';

import { useUpdate } from '@refinedev/core';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useState } from 'react';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { adminKeys } from '@/hooks/useAdmin';
import { appConfigKeys } from '@/hooks/useAppConfig';
import { adminErrorMessageKey, checked, emptyToNull } from '@/lib/adminUtils';
import type { PlatformModulePatchDto, PlatformModuleResponseDto } from '@/lib/api/types';

export function ModuleEditDrawer({ module, onCloseAction }: { module: PlatformModuleResponseDto | null; onCloseAction: () => void }) {
    const t = useTranslations('AdminPage');
    const tCommon = useTranslations('Common');
    const queryClient = useQueryClient();

    const { mutateAsync: updateModule, mutation } = useUpdate<PlatformModuleResponseDto>({
        dataProviderName: 'platform-modules',
        mutationOptions: {
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: adminKeys.platformModules });
                queryClient.invalidateQueries({ queryKey: appConfigKeys.all });
            },
        },
    });
    const [pendingInput, setPendingInput] = useState<PlatformModulePatchDto | null>(null);

    function close() {
        mutation.reset();
        setPendingInput(null);
        onCloseAction();
    }

    function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        setPendingInput({
            name: String(formData.get('name') ?? '').trim(),
            description: emptyToNull(formData.get('description')),
            sortOrder: Number(formData.get('sortOrder') ?? module?.sortOrder ?? 0),
            isEnabled: checked(formData, 'isEnabled'),
        });
    }

    async function confirmUpdate() {
        if (!module || !pendingInput) return;
        await updateModule({ resource: 'platform-modules', id: module.moduleKey, values: pendingInput });
        close();
    }

    function closeConfirmation() {
        setPendingInput(null);
    }

    return (
        <>
            <AdminDrawer
                open={Boolean(module)}
                onClose={close}
                closeLabel={t('cancel')}
                title={t('modules.editTitle')}
                subtitle={module?.name}
                footer={
                    <>
                        <div />
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={close}
                                className="min-h-9 rounded-md border border-border px-3.5 text-sm font-semibold text-ink-muted"
                            >
                                {t('cancel')}
                            </button>
                            <button
                                type="submit"
                                form="module-edit-form"
                                className="inline-flex min-h-9 items-center gap-2 rounded-md bg-ink px-3.5 text-sm font-semibold text-white disabled:opacity-50"
                            >
                                {t('save')}
                            </button>
                        </div>
                    </>
                }
            >
                {module && (
                    <form key={module.moduleKey} id="module-edit-form" onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-3">
                            <AdminField label={t('fields.name')} required>
                                <input name="name" required maxLength={100} defaultValue={module.name} className={adminInputClass()} />
                            </AdminField>
                            <AdminField label={t('fields.sort')} optional>
                                <input name="sortOrder" type="number" min={0} defaultValue={module.sortOrder} className={adminInputClass()} />
                            </AdminField>
                            <AdminField label={t('fields.description')} optional className="col-span-2">
                                <input name="description" defaultValue={module.description ?? ''} className={adminInputClass()} />
                            </AdminField>
                        </div>

                        <label className="inline-flex items-center gap-2 border-y border-border py-3 text-sm font-semibold text-ink-muted">
                            <input type="checkbox" name="isEnabled" defaultChecked={module.isEnabled} className="h-4 w-4 accent-primary" />
                            <span>
                                {t('modules.enabled')} <span className="text-ink-faint">({tCommon('optional')})</span>
                            </span>
                        </label>

                        {mutation.error && <p className="text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(mutation.error)}`)}</p>}
                    </form>
                )}
            </AdminDrawer>

            <ConfirmActionModal
                open={Boolean(pendingInput)}
                onCloseAction={closeConfirmation}
                title={t('modules.confirmTitle', { module: module?.name ?? '' })}
                body={t('modules.confirmBody')}
                cancelLabel={t('cancel')}
                confirmLabel={t('save')}
                isConfirming={mutation.isPending}
                onConfirmAction={confirmUpdate}
                tone="default"
                icon={mutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : undefined}
            />
        </>
    );
}
