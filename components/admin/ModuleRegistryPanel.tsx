'use client';

import { useList, useUpdate } from '@refinedev/core';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Pencil } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type FormEvent, type MouseEvent, useCallback, useMemo, useState } from 'react';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { adminKeys } from '@/hooks/useAdmin';
import { appConfigKeys } from '@/hooks/useAppConfig';
import { adminErrorMessageKey, checked, emptyToNull } from '@/lib/adminUtils';
import type { PlatformModulePatchDto, PlatformModuleResponseDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

function ModuleEditDrawer({ module, onClose }: { module: PlatformModuleResponseDto | null; onClose: () => void }) {
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
        onClose();
    }

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
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
                        <div className="grid gap-3 sm:grid-cols-[1fr_7rem]">
                            <AdminField label={t('fields.name')} required>
                                <input name="name" required maxLength={100} defaultValue={module.name} className={adminInputClass()} />
                            </AdminField>
                            <AdminField label={t('fields.sort')} optional>
                                <input name="sortOrder" type="number" min={0} defaultValue={module.sortOrder} className={adminInputClass()} />
                            </AdminField>
                            <AdminField label={t('fields.description')} optional className="sm:col-span-2">
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
                onClose={closeConfirmation}
                title={t('modules.confirmTitle', { module: module?.name ?? '' })}
                body={t('modules.confirmBody')}
                cancelLabel={t('cancel')}
                confirmLabel={t('save')}
                isConfirming={mutation.isPending}
                onConfirm={confirmUpdate}
                tone="default"
                icon={mutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : undefined}
            />
        </>
    );
}

export function ModuleRegistryPanel() {
    const t = useTranslations('AdminPage');
    const { result: modulesResult, query: modulesQuery } = useList<PlatformModuleResponseDto>({
        resource: 'platform-modules',
        dataProviderName: 'platform-modules',
        pagination: { mode: 'off' },
    });
    const [selectedModule, setSelectedModule] = useState<PlatformModuleResponseDto | null>(null);
    const modules = useMemo(() => [...modulesResult.data].sort((left, right) => left.sortOrder - right.sortOrder), [modulesResult.data]);

    function closeEditor() {
        setSelectedModule(null);
    }

    const handleEditClick = useCallback(
        (event: MouseEvent<HTMLButtonElement>) => {
            const moduleKey = event.currentTarget.dataset.moduleKey;
            const found = modules.find((item) => item.moduleKey === moduleKey);
            if (found) setSelectedModule(found);
        },
        [modules]
    );

    return (
        <section className="space-y-4">
            <div className="rounded-lg border border-status-warn-wash bg-status-warn-wash/40 px-4 py-3 text-sm leading-6 text-status-warn">
                {t('modules.notice')}
            </div>

            <section className="rounded-xl border border-border bg-card">
                {modulesQuery.isLoading && <p className="px-4 py-6 text-sm text-ink-muted">{t('modules.loading')}</p>}
                {modulesQuery.error && (
                    <p className="px-4 py-6 text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(modulesQuery.error)}`)}</p>
                )}
                {!modulesQuery.isLoading && !modulesQuery.error && modules.length === 0 && (
                    <p className="px-4 py-6 text-sm text-ink-muted">{t('modules.empty')}</p>
                )}

                {!modulesQuery.isLoading && !modulesQuery.error && modules.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[560px] border-collapse text-sm">
                            <thead>
                                <tr className="border-b border-border text-left text-[11px] font-bold uppercase tracking-wide text-ink-faint">
                                    <th className="px-4 py-2.5 font-bold">{t('fields.name')}</th>
                                    <th className="px-3 py-2.5 font-bold">{t('fields.sort')}</th>
                                    <th className="px-3 py-2.5 font-bold">{t('modules.enabled')}</th>
                                    <th className="px-3 py-2.5" />
                                </tr>
                            </thead>
                            <tbody>
                                {modules.map((module) => (
                                    <tr key={module.moduleKey} className="border-b border-border last:border-b-0 hover:bg-canvas/60">
                                        <td className="max-w-96 px-4 py-2.5">
                                            <p className="truncate font-semibold text-ink">{module.name}</p>
                                            {module.description && <p className="truncate text-[11px] text-ink-faint">{module.description}</p>}
                                        </td>
                                        <td className="px-3 py-2.5 tabular-nums text-ink-muted">{module.sortOrder}</td>
                                        <td className="px-3 py-2.5">
                                            <span
                                                className={cn(
                                                    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold',
                                                    module.isEnabled
                                                        ? 'bg-status-good-wash text-status-good'
                                                        : 'bg-status-neutral-wash text-status-neutral'
                                                )}
                                            >
                                                <span
                                                    className={cn(
                                                        'h-1.5 w-1.5 rounded-full',
                                                        module.isEnabled ? 'bg-status-good' : 'bg-status-neutral'
                                                    )}
                                                />
                                                {module.isEnabled ? t('modules.enabled') : t('modules.disabled')}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2.5 text-right">
                                            <button
                                                type="button"
                                                data-module-key={module.moduleKey}
                                                onClick={handleEditClick}
                                                aria-label={t('modules.edit')}
                                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-canvas hover:text-ink"
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <ModuleEditDrawer module={selectedModule} onClose={closeEditor} />
        </section>
    );
}
