'use client';

import { Check, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type FormEvent } from 'react';

import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { useAdminPlatformModules, useUpdatePlatformModule } from '@/hooks/useAdmin';
import { adminErrorMessageKey, checked, emptyToNull } from '@/lib/adminUtils';
import type { PlatformModuleResponseDto } from '@/lib/api/types';

function ModuleRow({ module }: { module: PlatformModuleResponseDto }) {
    const t = useTranslations('AdminPage');
    const updateModule = useUpdatePlatformModule();

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        updateModule.mutate({
            moduleKey: module.moduleKey,
            input: {
                name: String(formData.get('name') ?? '').trim(),
                description: emptyToNull(formData.get('description')),
                sortOrder: Number(formData.get('sortOrder') ?? module.sortOrder),
                isEnabled: checked(formData, 'isEnabled'),
            },
        });
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="grid gap-2.5 rounded-xl border border-border bg-card p-3 shadow-sm md:grid-cols-[minmax(10rem,0.9fr)_minmax(14rem,1.25fr)_5.5rem_auto] md:items-end"
        >
            <AdminField label={module.moduleKey}>
                <input name="name" required maxLength={100} defaultValue={module.name} className={adminInputClass()} />
            </AdminField>
            <AdminField label={t('fields.description')}>
                <input name="description" defaultValue={module.description ?? ''} className={adminInputClass()} />
            </AdminField>
            <AdminField label={t('fields.sort')}>
                <input name="sortOrder" type="number" min={0} defaultValue={module.sortOrder} className={adminInputClass()} />
            </AdminField>
            <div className="flex items-center justify-between gap-3 md:justify-end">
                <label className="inline-flex items-center gap-2 text-sm font-medium text-ink-muted">
                    <input type="checkbox" name="isEnabled" defaultChecked={module.isEnabled} className="h-4 w-4 accent-primary" />
                    {t('modules.enabled')}
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
    );
}

export function ModuleRegistryPanel() {
    const t = useTranslations('AdminPage');
    const modulesQuery = useAdminPlatformModules();
    const modules = [...(modulesQuery.data ?? [])].sort((left, right) => left.sortOrder - right.sortOrder);

    return (
        <section className="space-y-3">
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">{t('modules.notice')}</div>
            {modulesQuery.isLoading && <p className="text-sm text-ink-muted">{t('modules.loading')}</p>}
            {modulesQuery.error && <p className="text-sm text-rose-600">{t(`errors.${adminErrorMessageKey(modulesQuery.error)}`)}</p>}
            {modules.map((module) => (
                <ModuleRow key={module.moduleKey} module={module} />
            ))}
        </section>
    );
}
