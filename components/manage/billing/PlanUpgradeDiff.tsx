'use client';

import { ArrowRight, Check, Minus } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { useLocalizedModuleLabel } from '@/hooks/useLocalizedModuleLabel';
import type { PlanTierResponseDto, PlatformModuleResponseDto } from '@/lib/api/types';
import { formatBytes } from '@/lib/format';
import { buildPlanUpgradeDiff, type PlanUpgradeLimitChange } from '@/lib/planUpgradeDiff';

export function PlanUpgradeDiff({
    currentPlan,
    targetPlan,
    modules,
}: {
    currentPlan: PlanTierResponseDto | null;
    targetPlan: PlanTierResponseDto | null;
    modules: PlatformModuleResponseDto[];
}) {
    const t = useTranslations('EventPlanSettingsPage.compare');
    const locale = useLocale();
    const moduleLabel = useLocalizedModuleLabel(modules);

    if (!currentPlan || !targetPlan) return null;

    const diff = buildPlanUpgradeDiff(currentPlan, targetPlan);
    const hasChanges = diff.limitChanges.length > 0 || diff.addedModuleKeys.length > 0 || diff.removedModuleKeys.length > 0;

    function formatLimit(change: PlanUpgradeLimitChange, value: number | null): string {
        if (value === null) return t('unlimited');
        if (change.key === 'storage') return formatBytes(value);
        if (change.key === 'retention') return t('monthCount', { count: value });
        return new Intl.NumberFormat(locale).format(value);
    }

    return (
        <div className="mt-4 overflow-hidden rounded-lg bg-surface-muted/55">
            {/* Limit changes */}
            {diff.limitChanges.length > 0 && (
                <dl className="divide-y divide-border/60">
                    {diff.limitChanges.map((change) => (
                        <div key={change.key} className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-4 py-3 sm:grid-cols-[8rem_minmax(0,1fr)_auto_minmax(0,1fr)]">
                            <dt className="col-span-3 text-xs font-semibold text-ink-muted sm:col-span-1">
                                {t(change.key === 'retention' ? 'includedMonths' : change.key)}
                            </dt>
                            <dd className="min-w-0 text-sm text-ink-muted">{formatLimit(change, change.current)}</dd>
                            <ArrowRight className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden="true" />
                            <dd className="min-w-0 text-sm font-semibold text-ink">{formatLimit(change, change.target)}</dd>
                        </div>
                    ))}
                </dl>
            )}

            {/* Module changes */}
            {(diff.addedModuleKeys.length > 0 || diff.removedModuleKeys.length > 0) && (
                <div className="space-y-3 border-t border-border/60 px-4 py-3 first:border-t-0">
                    {diff.addedModuleKeys.length > 0 && (
                        <div>
                            <p className="text-xs font-semibold text-ink-muted">{t('moduleChanges')}</p>
                            <ul className="mt-2 grid gap-3 sm:grid-cols-2">
                                {diff.addedModuleKeys.map((moduleKey) => {
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
                    {diff.removedModuleKeys.length > 0 && (
                        <div>
                            <p className="text-xs font-semibold text-status-danger">{t('removedModules')}</p>
                            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
                                {diff.removedModuleKeys.map((moduleKey) => (
                                    <li key={moduleKey} className="inline-flex items-center gap-1.5 text-sm text-status-danger">
                                        <Minus className="h-4 w-4" aria-hidden="true" />
                                        {moduleLabel(moduleKey).name}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            {!hasChanges && <p className="px-4 py-3 text-sm text-ink-muted">{t('noChanges')}</p>}
        </div>
    );
}
