'use client';

import { CalendarCheck, HelpCircle, Images, MessageSquareText, Music } from 'lucide-react';
import type { ComponentType } from 'react';

import type { PlatformModuleResponseDto } from '@/lib/api/types';
import { PLAN_COMPARISON_EMPTY, formatPlanText } from '@/lib/planComparison';

const moduleIcons: Record<string, ComponentType<{ className?: string }>> = {
    posts: MessageSquareText,
    rsvp: CalendarCheck,
    playlist: Music,
    stories: Images,
    gallery: Images,
};

export type ModuleMeta = {
    key: string;
    name: string;
    description: string;
    Icon: ComponentType<{ className?: string }>;
};

export function getModuleMeta(moduleKey: string, modules: PlatformModuleResponseDto[]): ModuleMeta {
    const module_ = modules.find((item) => item.moduleKey === moduleKey);
    return {
        key: moduleKey,
        name: module_?.name ?? moduleKey,
        description: formatPlanText(module_?.description ?? null),
        Icon: moduleIcons[moduleKey] ?? HelpCircle,
    };
}

export function PlanModuleIcons({ moduleKeys, modules }: { moduleKeys: string[]; modules: PlatformModuleResponseDto[] }) {
    if (moduleKeys.length === 0) return <span>{PLAN_COMPARISON_EMPTY}</span>;

    return (
        <div className="flex flex-wrap gap-1.5">
            {moduleKeys.map((moduleKey) => {
                const meta = getModuleMeta(moduleKey, modules);
                const label = meta.description !== PLAN_COMPARISON_EMPTY ? `${meta.name}: ${meta.description}` : meta.name;
                const Icon = meta.Icon;

                return (
                    <span
                        key={moduleKey}
                        title={label}
                        aria-label={label}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-ink-muted"
                    >
                        <Icon className="h-4 w-4" />
                    </span>
                );
            })}
        </div>
    );
}
