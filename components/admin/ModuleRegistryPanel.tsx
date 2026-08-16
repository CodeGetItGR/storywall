'use client';

import { Loader2, Pencil } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { Modal } from '@/components/ui/modal';
import { useAdminPlatformModules, useUpdatePlatformModule } from '@/hooks/useAdmin';
import { adminErrorMessageKey, checked, emptyToNull } from '@/lib/adminUtils';
import type { PlatformModulePatchDto, PlatformModuleResponseDto } from '@/lib/api/types';

function ModuleEditDialog({ module, onClose }: { module: PlatformModuleResponseDto | null; onClose: () => void }) {
    const t = useTranslations('AdminPage');
    const tCommon = useTranslations('Common');
    const updateModule = useUpdatePlatformModule();
    const [pendingInput, setPendingInput] = useState<PlatformModulePatchDto | null>(null);

    function close() {
        updateModule.reset();
        setPendingInput(null);
        onClose();
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
        await updateModule.mutateAsync({ moduleKey: module.moduleKey, input: pendingInput });
        close();
    }

    function closeConfirmation() {
        setPendingInput(null);
    }

    return (
        <>
            <Modal open={Boolean(module)} onClose={close} size="md" closeLabel={t('cancel')}>
                <Modal.Body className="px-4 pb-4 pt-12 sm:px-5">
                    {module && (
                        <form key={module.moduleKey} onSubmit={handleSubmit} className="space-y-5">
                            <div className="pr-10">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-dark">{module.moduleKey}</p>
                                <h2 className="mt-1 text-lg font-semibold text-ink">{t('modules.editTitle')}</h2>
                            </div>

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

                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={close}
                                    className="min-h-10 rounded-md border border-border px-4 text-sm font-semibold text-ink-muted"
                                >
                                    {t('cancel')}
                                </button>
                                <button type="submit" className="min-h-10 rounded-md bg-ink px-4 text-sm font-semibold text-white">
                                    {t('save')}
                                </button>
                            </div>
                            {updateModule.error && <p className="text-sm text-rose-600">{t(`errors.${adminErrorMessageKey(updateModule.error)}`)}</p>}
                        </form>
                    )}
                </Modal.Body>
            </Modal>

            <ConfirmActionModal
                open={Boolean(pendingInput)}
                onClose={closeConfirmation}
                title={t('modules.confirmTitle', { module: module?.moduleKey ?? '' })}
                body={t('modules.confirmBody')}
                cancelLabel={t('cancel')}
                confirmLabel={t('save')}
                isConfirming={updateModule.isPending}
                onConfirm={confirmUpdate}
                tone="default"
                icon={updateModule.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : undefined}
            />
        </>
    );
}

function ModuleRow({ module, onEdit }: { module: PlatformModuleResponseDto; onEdit: (module: PlatformModuleResponseDto) => void }) {
    const t = useTranslations('AdminPage');

    function handleEdit() {
        onEdit(module);
    }

    return (
        <article className="border-b border-border py-4 last:border-b-0">
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-ink">{module.name}</h3>
                        <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-bold text-ink-muted">{module.moduleKey}</span>
                        <span
                            className={
                                module.isEnabled
                                    ? 'rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800'
                                    : 'rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800'
                            }
                        >
                            {module.isEnabled ? t('modules.enabled') : t('modules.disabled')}
                        </span>
                    </div>
                    {module.description && <p className="mt-1 text-sm leading-5 text-ink-muted">{module.description}</p>}
                    <dl className="mt-2 flex gap-5 text-sm">
                        <div>
                            <dt className="inline text-ink-faint">{t('fields.sort')}: </dt>
                            <dd className="inline font-medium text-ink-muted">{module.sortOrder}</dd>
                        </div>
                    </dl>
                </div>
                <button
                    type="button"
                    onClick={handleEdit}
                    className="inline-flex min-h-9 shrink-0 items-center gap-2 rounded-md border border-border px-3 text-sm font-semibold text-ink-muted hover:bg-surface-muted hover:text-ink"
                >
                    <Pencil className="h-3.5 w-3.5" />
                    {t('modules.edit')}
                </button>
            </div>
        </article>
    );
}

export function ModuleRegistryPanel() {
    const t = useTranslations('AdminPage');
    const modulesQuery = useAdminPlatformModules();
    const [selectedModule, setSelectedModule] = useState<PlatformModuleResponseDto | null>(null);
    const modules = useMemo(() => [...(modulesQuery.data ?? [])].sort((left, right) => left.sortOrder - right.sortOrder), [modulesQuery.data]);

    function closeEditor() {
        setSelectedModule(null);
    }

    return (
        <section className="space-y-3">
            <div className="border-b border-amber-200 pb-3 text-sm text-amber-800">{t('modules.notice')}</div>
            {modulesQuery.isLoading && <p className="text-sm text-ink-muted">{t('modules.loading')}</p>}
            {modulesQuery.error && <p className="text-sm text-rose-600">{t(`errors.${adminErrorMessageKey(modulesQuery.error)}`)}</p>}
            {!modulesQuery.isLoading && !modulesQuery.error && modules.length === 0 && (
                <p className="py-4 text-sm text-ink-muted">{t('modules.empty')}</p>
            )}
            {modules.map((module) => (
                <ModuleRow key={module.moduleKey} module={module} onEdit={setSelectedModule} />
            ))}
            <ModuleEditDialog module={selectedModule} onClose={closeEditor} />
        </section>
    );
}
