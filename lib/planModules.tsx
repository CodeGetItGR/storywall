import { BookHeart, CalendarCheck, CalendarDays, Gift, HelpCircle, Images, MessageSquareText, Music, Palette, Tags, UserCog } from 'lucide-react';
import type { ComponentType } from 'react';

import type {
    AppModuleCopyDto,
    EventTypeModulePatchDto,
    LocalizedText,
    PaidServiceResponseDto,
    PlanTierResponseDto,
    PlatformModuleResponseDto,
} from '@/lib/api/types';
import { PLAN_COMPARISON_EMPTY } from '@/lib/planComparison';

const moduleIcons: Record<string, ComponentType<{ className?: string }>> = {
    posts: MessageSquareText,
    rsvp: CalendarCheck,
    playlist: Music,
    stories: Images,
    gallery: Images,
    wishlist: Gift,
    wishbook: BookHeart,
    member_roles: Tags,
    theme: Palette,
    schedule: CalendarDays,
    co_hosts: UserCog,
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
    wishlist: {
        name: 'Wishlist',
        description: 'Shares the host’s gift account (IBAN) with guests who want to send a gift.',
    },
    wishbook: {
        name: 'Wishbook',
        description: 'Lets guests leave written wishes and messages for the host to keep.',
    },
    member_roles: {
        name: 'Guest roles',
        description: 'Guests pick a role, like best man, shown next to their name.',
    },
    theme: {
        name: 'Theme',
        description: 'An illustration and background colour for the event.',
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

export type ModuleCopy = {
    name: string;
    description: string;
    // The module's line on plan cards.
    cardLabel: string;
};

// What an event type calls a module: the admin's override for that type, else
// the app's own translation, else the platform module's name. Each field falls
// back on its own, and the card label falls back to the resolved name.
// See module-names-per-event-type-fe-integration.md.
export function resolveModuleCopy({
    override,
    translated,
    platform,
    localize,
}: {
    override: AppModuleCopyDto | undefined;
    translated: { name?: string; description?: string };
    platform: ModuleMeta;
    localize: (text: LocalizedText | null | undefined) => string;
}): ModuleCopy {
    const name = localize(override?.name) || translated.name || platform.name;
    return {
        name,
        description: localize(override?.description) || translated.description || platform.description,
        cardLabel: localize(override?.cardLabel) || name,
    };
}

// The wording an admin can override per event type, in both locales (see
// module-names-per-event-type-fe-integration.md §2).
export const MODULE_COPY_FIELDS = ['name', 'description', 'cardLabel'] as const;
export type ModuleCopyField = (typeof MODULE_COPY_FIELDS)[number];
export const MODULE_COPY_LOCALES = ['en', 'el'] as const;
export type ModuleCopyLocale = (typeof MODULE_COPY_LOCALES)[number];
export const MODULE_COPY_MAX_LENGTH: Record<ModuleCopyField, number> = { name: 40, description: 160, cardLabel: 40 };

export type ModuleCopyDraft = Record<ModuleCopyField, Record<ModuleCopyLocale, string>>;
type ModuleCopyOverrides = Partial<Record<ModuleCopyField, LocalizedText | null>>;

export function hasModuleCopyOverride(row: ModuleCopyOverrides): boolean {
    return MODULE_COPY_FIELDS.some((field) => Boolean(row[field]));
}

export function moduleCopyDraft(row: ModuleCopyOverrides): ModuleCopyDraft {
    const draft = {} as ModuleCopyDraft;
    for (const field of MODULE_COPY_FIELDS) draft[field] = { en: row[field]?.en ?? '', el: row[field]?.el ?? '' };
    return draft;
}

// The PATCH body for a draft: a field left empty in both locales goes back to
// the default (null). One locale filled and the other empty is incomplete.
export function moduleCopyPatch(
    draft: ModuleCopyDraft,
): { patch: EventTypeModulePatchDto } | { incomplete: { field: ModuleCopyField; locale: ModuleCopyLocale } } {
    const patch: EventTypeModulePatchDto = {};
    for (const field of MODULE_COPY_FIELDS) {
        const en = draft[field].en.trim();
        const el = draft[field].el.trim();
        if (!en && !el) patch[field] = null;
        else if (!en || !el) return { incomplete: { field, locale: en ? 'el' : 'en' } };
        else patch[field] = { en, el };
    }
    return { patch };
}

export function enabledModuleKeys(moduleKeys: string[], modules: PlatformModuleResponseDto[]): string[] {
    const enabledKeys = new Set(modules.filter((module_) => module_.isEnabled).map((module_) => module_.moduleKey));
    return moduleKeys.filter((moduleKey) => enabledKeys.has(moduleKey));
}

export function publicEnabledModules(modules: PlatformModuleResponseDto[]): PlatformModuleResponseDto[] {
    return modules.filter((module_) => module_.isEnabled).sort((left, right) => left.sortOrder - right.sortOrder);
}

export function publicAssignableModuleUnlocks(
    paidServices: PaidServiceResponseDto[],
    modules: PlatformModuleResponseDto[],
    plan?: PlanTierResponseDto | null,
): PaidServiceResponseDto[] {
    if (!plan) return [];

    const enabledModules = new Map(publicEnabledModules(modules).map((module_) => [module_.moduleKey, module_]));

    return paidServices
        .filter(
            (service) =>
                service.kind === 'MODULE_UNLOCK' &&
                service.isPublic &&
                service.isAssignable &&
                service.grantsModuleKey &&
                enabledModules.has(service.grantsModuleKey) &&
                !plan.moduleKeys.includes(service.grantsModuleKey) &&
                (service.planTierIds.length === 0 || service.planTierIds.includes(plan.id)),
        )
        .sort((left, right) => {
            const leftModuleOrder = enabledModules.get(left.grantsModuleKey ?? '')?.sortOrder ?? Number.MAX_SAFE_INTEGER;
            const rightModuleOrder = enabledModules.get(right.grantsModuleKey ?? '')?.sortOrder ?? Number.MAX_SAFE_INTEGER;
            return leftModuleOrder - rightModuleOrder || left.sortOrder - right.sortOrder;
        });
}

export function publicAssignableEventAddons(
    paidServices: PaidServiceResponseDto[],
    modules: PlatformModuleResponseDto[],
    plan?: PlanTierResponseDto | null,
): PaidServiceResponseDto[] {
    if (!plan) return [];

    const enabledModuleKeys = new Set(publicEnabledModules(modules).map((module_) => module_.moduleKey));

    return paidServices
        .filter((service) => {
            if (!service.isPublic || !service.isAssignable || service.kind === 'STORAGE_PACK') return false;
            if (service.planTierIds.length > 0 && !service.planTierIds.includes(plan.id)) return false;

            if (service.kind === 'MODULE_UNLOCK') {
                return Boolean(
                    service.grantsModuleKey && enabledModuleKeys.has(service.grantsModuleKey) && !plan.moduleKeys.includes(service.grantsModuleKey),
                );
            }

            return service.kind === 'RECURRING_ADDON';
        })
        .sort((left, right) => left.sortOrder - right.sortOrder);
}
