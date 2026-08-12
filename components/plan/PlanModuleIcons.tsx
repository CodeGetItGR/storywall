'use client';

import { CalendarCheck, HelpCircle, Images, MessageSquareText, Music } from 'lucide-react';
import type { ComponentType } from 'react';

import type { PlatformModuleResponseDto } from '@/lib/api/types';
import { PLAN_COMPARISON_EMPTY } from '@/lib/planComparison';

const moduleIcons: Record<string, ComponentType<{ className?: string }>> = {
    posts: MessageSquareText,
    rsvp: CalendarCheck,
    playlist: Music,
    stories: Images,
    gallery: Images,
};

const moduleFallbacks: Record<string, { name: string; description: string }> = {
    posts: {
        name: 'Posts',
        description: 'Lets guests share messages, photos, reactions, and comments on the event wall.',
    },
    rsvp: {
        name: 'RSVP',
        description: 'Collects guest attendance, notes, seat counts, and session replies.',
    },
    playlist: {
        name: 'Playlist',
        description: 'Lets guests suggest songs and vote on the tracks they want to hear.',
    },
    stories: {
        name: 'Stories',
        description: 'Adds short-lived story posts for quick moments from guests and hosts.',
    },
    gallery: {
        name: 'Gallery',
        description: 'Lets guests upload event photos into a dedicated gallery for the host to review.',
    },
};

export type ModuleMeta = {
    key: string;
    name: string;
    description: string;
    Icon: ComponentType<{ className?: string }>;
};

export function getModuleMeta(moduleKey: string, modules: PlatformModuleResponseDto[]): ModuleMeta {
    const module_ = modules.find((item) => item.moduleKey === moduleKey);
    const fallback = moduleFallbacks[moduleKey];
    const description = module_?.description?.trim();

    return {
        key: moduleKey,
        name: module_?.name ?? fallback?.name ?? moduleKey,
        description: description && description !== PLAN_COMPARISON_EMPTY ? description : (fallback?.description ?? 'Included in this plan.'),
        Icon: moduleIcons[moduleKey] ?? HelpCircle,
    };
}

export function enabledModuleKeys(moduleKeys: string[], modules: PlatformModuleResponseDto[]): string[] {
    const enabledKeys = new Set(modules.filter((module_) => module_.isEnabled).map((module_) => module_.moduleKey));
    return moduleKeys.filter((moduleKey) => enabledKeys.has(moduleKey));
}

export function PlanModuleIcons({ moduleKeys, modules }: { moduleKeys: string[]; modules: PlatformModuleResponseDto[] }) {
    const visibleModuleKeys = enabledModuleKeys(moduleKeys, modules);

    if (visibleModuleKeys.length === 0) return <span>{PLAN_COMPARISON_EMPTY}</span>;

    return (
        <div className="flex flex-wrap gap-1.5">
            {visibleModuleKeys.map((moduleKey) => {
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
