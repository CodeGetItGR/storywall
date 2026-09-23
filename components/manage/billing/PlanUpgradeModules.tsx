'use client';

import { Check, Minus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useLocalizedModuleLabel } from '@/hooks/useLocalizedModuleLabel';
import type { PlatformModuleResponseDto } from '@/lib/api/types';

/** The features an upgrade adds, with descriptions, and any it no longer includes. */
export function PlanUpgradeModules({
    addedModuleKeys,
    removedModuleKeys,
    modules,
}: {
    addedModuleKeys: string[];
    removedModuleKeys: string[];
    modules: PlatformModuleResponseDto[];
}) {
    const t = useTranslations('EventPlanSettingsPage.compare');
    const moduleLabel = useLocalizedModuleLabel(modules);

    return (
        <div className="space-y-3 rounded-lg bg-surface-muted/55 px-4 py-3">
            {/* Added modules */}
            {addedModuleKeys.length > 0 && (
                <div>
                    <p className="text-xs font-semibold text-ink-muted">{t('moduleChanges')}</p>
                    <ul className="mt-2 grid gap-3 sm:grid-cols-2">
                        {addedModuleKeys.map((moduleKey) => {
                            const moduleCopy = moduleLabel(moduleKey);
                            return (
                                <li key={moduleKey} className="flex items-start gap-2 text-sm text-ink">
                                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                                    <div className="min-w-0">
                                        <p className="font-semibold">{moduleCopy.name}</p>
                                        <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">{moduleCopy.description}</p>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}

            {/* Removed modules */}
            {removedModuleKeys.length > 0 && (
                <div>
                    <p className="text-xs font-semibold text-status-danger">{t('removedModules')}</p>
                    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
                        {removedModuleKeys.map((moduleKey) => (
                            <li key={moduleKey} className="inline-flex items-center gap-1.5 text-sm text-status-danger">
                                <Minus className="h-4 w-4" aria-hidden="true" />
                                {moduleLabel(moduleKey).name}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
