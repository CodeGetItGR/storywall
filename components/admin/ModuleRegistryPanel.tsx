'use client';

import { useList } from '@refinedev/core';
import { Pencil } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type MouseEvent, useCallback, useMemo, useState } from 'react';

import { ModuleEditDrawer } from '@/components/admin/ModuleEditDrawer';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { PlatformModuleResponseDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

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
                        <table className="w-full min-w-140 border-collapse text-sm">
                            <thead>
                                <tr className="border-b border-border text-left text-[11px] font-bold uppercase tracking-wide text-ink-faint">
                                    <th className="px-4 py-2.5 font-bold">{t('fields.name')}</th>
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

            <ModuleEditDrawer module={selectedModule} onCloseAction={closeEditor} />
        </section>
    );
}
