import type { Locale } from '@/i18n/config';
import type { MemberRoleCatalogDto, MemberRoleCatalogPatchDto, MemberRoleCatalogRequestDto } from '@/lib/api/types';

// /api/config memberRolesByEventType: each event type's role catalog,
// retired roles included (member-roles-fe-integration.md §5.1).
export type MemberRoleCatalog = Record<string, MemberRoleCatalogDto[]>;

// A member's role as display text: custom text as typed, or the catalog
// label in the locale (English fallback) with its emoji. Null when there's
// nothing to show — an unknown key renders nothing rather than the raw key.
export function memberRoleLabel({
    roleKey,
    customRole,
    eventTypeKey,
    catalog,
    locale,
}: {
    roleKey: string | null;
    customRole: string | null;
    eventTypeKey: string | null | undefined;
    catalog: MemberRoleCatalog;
    locale: Locale;
}): string | null {
    if (customRole) return customRole;
    if (!roleKey || !eventTypeKey) return null;
    const role = catalog[eventTypeKey]?.find((item) => item.roleKey === roleKey);
    if (!role) return null;
    const label = role.label[locale] || role.label.en;
    return role.emoji ? `${role.emoji} ${label}` : label;
}

export function activeRoleCount(catalog: MemberRoleCatalog, eventTypeKey: string | null): number {
    if (!eventTypeKey) return 0;
    return (catalog[eventTypeKey] ?? []).filter((role) => !role.retired).length;
}

// Admin catalog rules (member-roles-fe-integration.md §9).
const ROLE_KEY_PATTERN = /^[A-Z][A-Z0-9_]{1,49}$/;
const ROLE_LABEL_MAX = 40;
const ROLE_EMOJI_MAX = 16;

export type RoleStatusFilter = 'ALL' | 'ACTIVE' | 'RETIRED';
export const ROLE_STATUS_FILTERS: RoleStatusFilter[] = ['ALL', 'ACTIVE', 'RETIRED'];

export type MemberRoleDraft = {
    roleKey: string;
    labelEn: string;
    labelEl: string;
    emoji: string;
    limited: boolean;
    maxHolders: string;
};

export type MemberRoleDraftErrors = Partial<Record<'roleKey' | 'labelEn' | 'labelEl' | 'emoji' | 'maxHolders', true>>;

export function normalizeRoleKeyInput(value: string): string {
    return value.toUpperCase().replace(/\s+/g, '_');
}

export function isValidRoleKey(roleKey: string): boolean {
    return ROLE_KEY_PATTERN.test(roleKey);
}

function isValidLabel(label: string): boolean {
    const trimmed = label.trim();
    return trimmed.length >= 1 && trimmed.length <= ROLE_LABEL_MAX;
}

function isValidCap(text: string): boolean {
    const value = Number(text.trim());
    return text.trim() !== '' && Number.isInteger(value) && value >= 1;
}

export function draftFromRole(role: MemberRoleCatalogDto | null): MemberRoleDraft {
    return {
        roleKey: role?.roleKey ?? '',
        labelEn: role?.label.en ?? '',
        labelEl: role?.label.el ?? '',
        emoji: role?.emoji ?? '',
        limited: role?.maxHolders != null,
        maxHolders: role?.maxHolders != null ? String(role.maxHolders) : '',
    };
}

export function validateRoleDraft(draft: MemberRoleDraft, isCreate: boolean): MemberRoleDraftErrors {
    const errors: MemberRoleDraftErrors = {};
    if (isCreate && !isValidRoleKey(draft.roleKey)) errors.roleKey = true;
    if (!isValidLabel(draft.labelEn)) errors.labelEn = true;
    if (!isValidLabel(draft.labelEl)) errors.labelEl = true;
    if (draft.emoji.trim().length > ROLE_EMOJI_MAX) errors.emoji = true;
    if (draft.limited && !isValidCap(draft.maxHolders)) errors.maxHolders = true;
    return errors;
}

export function buildCreatePayload(draft: MemberRoleDraft, eventTypeKey: string, sortOrder: number): MemberRoleCatalogRequestDto {
    const payload: MemberRoleCatalogRequestDto = {
        eventTypeKey,
        roleKey: draft.roleKey,
        label: { en: draft.labelEn.trim(), el: draft.labelEl.trim() },
        sortOrder,
    };
    const emoji = draft.emoji.trim();
    if (emoji) payload.emoji = emoji;
    if (draft.limited) payload.maxHolders = Number(draft.maxHolders.trim());
    return payload;
}

// Only what changed, so the server never revalidates untouched fields.
export function buildPatchPayload(role: MemberRoleCatalogDto, draft: MemberRoleDraft): MemberRoleCatalogPatchDto {
    const patch: MemberRoleCatalogPatchDto = {};
    const label = { en: draft.labelEn.trim(), el: draft.labelEl.trim() };
    if (label.en !== role.label.en || label.el !== role.label.el) patch.label = label;
    const emoji = draft.emoji.trim();
    if (emoji !== (role.emoji ?? '')) patch.emoji = emoji;
    if (!draft.limited) {
        if (role.maxHolders !== null) patch.clearMaxHolders = true;
    } else {
        const maxHolders = Number(draft.maxHolders.trim());
        if (maxHolders !== role.maxHolders) patch.maxHolders = maxHolders;
    }
    return patch;
}

export function sortRoles(roles: MemberRoleCatalogDto[]): MemberRoleCatalogDto[] {
    return [...roles].sort((left, right) => left.sortOrder - right.sortOrder || left.roleKey.localeCompare(right.roleKey));
}

export function nextSortOrder(roles: MemberRoleCatalogDto[]): number {
    return roles.length === 0 ? 0 : Math.max(...roles.map((role) => role.sortOrder)) + 1;
}

export function filterRoles(roles: MemberRoleCatalogDto[], search: string, status: RoleStatusFilter, locale: Locale): MemberRoleCatalogDto[] {
    const needle = search.trim().toLocaleLowerCase(locale);
    return roles.filter((role) => {
        if (status === 'ACTIVE' && role.retired) return false;
        if (status === 'RETIRED' && !role.retired) return false;
        if (!needle) return true;
        return [role.roleKey, role.label.en, role.label.el].some((text) => text.toLocaleLowerCase(locale).includes(needle));
    });
}

export type SortOrderUpdate = { id: string; sortOrder: number };

// The PATCHes that move one role a step up or down. Swaps sortOrder with the
// neighbour; if any two roles tie, renumbers the list 0..n-1 first so the swap
// actually changes the order. Returns only the roles whose value changes.
export function planRoleMove(roles: MemberRoleCatalogDto[], roleId: string, direction: 'up' | 'down'): SortOrderUpdate[] {
    const sorted = sortRoles(roles);
    const index = sorted.findIndex((role) => role.id === roleId);
    const neighbour = direction === 'up' ? index - 1 : index + 1;
    if (index < 0 || neighbour < 0 || neighbour >= sorted.length) return [];

    const hasTies = new Set(sorted.map((role) => role.sortOrder)).size !== sorted.length;
    const orders = sorted.map((role, position) => (hasTies ? position : role.sortOrder));
    [orders[index], orders[neighbour]] = [orders[neighbour], orders[index]];

    return sorted.flatMap((role, position) => (orders[position] === role.sortOrder ? [] : [{ id: role.id, sortOrder: orders[position] }]));
}
