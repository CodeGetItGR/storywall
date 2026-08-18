'use client';

import { useTranslations } from 'next-intl';

import type { PlatformModuleResponseDto } from '@/lib/api/types';
import { PLAN_COMPARISON_EMPTY } from '@/lib/planComparison';
import { enabledModuleKeys, getModuleMeta } from '@/lib/planModules';

export function PlanModuleIcons({
    moduleKeys,
    modules,
    showDisabled = false,
    variant = 'included',
    detailByModuleKey,
}: {
    moduleKeys: string[];
    modules: PlatformModuleResponseDto[];
    showDisabled?: boolean;
    variant?: 'included' | 'addon';
    detailByModuleKey?: Record<string, string>;
}) {
    const tModules = useTranslations('Modules');
    const visibleModuleKeys = showDisabled ? moduleKeys : enabledModuleKeys(moduleKeys, modules);

    if (visibleModuleKeys.length === 0) return variant === 'included' ? <span>{PLAN_COMPARISON_EMPTY}</span> : null;

    return (
        <div className="flex flex-wrap gap-1.5">
            {visibleModuleKeys.map((moduleKey) => {
                const meta = getModuleMeta(moduleKey, modules);
                const name = tModules.has(`${moduleKey}.name`) ? tModules(`${moduleKey}.name`) : meta.name;
                const description = tModules.has(`${moduleKey}.description`) ? tModules(`${moduleKey}.description`) : meta.description;
                const baseLabel = description !== PLAN_COMPARISON_EMPTY ? `${name}: ${description}` : name;
                const detail = detailByModuleKey?.[moduleKey];
                const label = detail ? `${baseLabel} (${detail})` : baseLabel;
                const Icon = meta.Icon;

                return (
                    <span
                        key={moduleKey}
                        title={label}
                        aria-label={label}
                        className={
                            variant === 'addon'
                                ? 'inline-flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-border bg-background text-ink-muted opacity-60'
                                : 'inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-ink-muted'
                        }
                    >
                        <Icon className="h-4 w-4" />
                    </span>
                );
            })}
        </div>
    );
}
