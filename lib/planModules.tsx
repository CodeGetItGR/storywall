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
