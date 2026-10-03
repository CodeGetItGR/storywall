import type { Locale } from '@/i18n/config';
import { ERROR_CODES, getErrorCode } from '@/lib/api/errors';
import type {
    AuthorDto,
    EventMemberResponseDto,
    EventModuleResponseDto,
    EventStatus,
    MemberRoleCatalogDto,
    MemberRoleCatalogPatchDto,
    MemberRoleCatalogRequestDto,
    MemberRoleOptionDto,
    MemberRoleRequestDto,
} from '@/lib/api/types';
import { isEventDeleted, isModuleAvailable } from '@/lib/eventLifecycle';

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
    const maxHolders = role?.maxHolders ?? null;
    return {
        roleKey: role?.roleKey ?? '',
        labelEn: role?.label.en ?? '',
        labelEl: role?.label.el ?? '',
        emoji: role?.emoji ?? '',
        limited: maxHolders !== null,
        maxHolders: maxHolders !== null ? String(maxHolders) : '',
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

// ── Member picker (member-roles-fe-integration.md §2) ──

export const OTHER_CHOICE = '__other__';
// /api/config memberCustomRelationshipRoleMaxLength, used until config loads.
export const DEFAULT_CUSTOM_ROLE_MAX = 40;

type MemberRoleFields = Pick<EventMemberResponseDto, 'relationshipRole' | 'customRelationshipRole'>;
export type RoleValue = { roleKey: string | null; customRole: string | null };

// choice is a catalog roleKey, OTHER_CHOICE, or null when nothing is picked.
export type RolePickerDraft = { choice: string | null; customText: string };

export function memberHasRole(member: MemberRoleFields): boolean {
    return Boolean(member.relationshipRole || member.customRelationshipRole);
}

export function draftFromMember(member: MemberRoleFields): RolePickerDraft {
    if (member.customRelationshipRole) return { choice: OTHER_CHOICE, customText: member.customRelationshipRole };
    return { choice: member.relationshipRole, customText: '' };
}

// Mirrors the server's whitespace normalization so the cached copy matches.
function normalizeCustomRole(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
}

export function buildRoleRequest(draft: RolePickerDraft): MemberRoleRequestDto | null {
    if (draft.choice === null) return null;
    if (draft.choice !== OTHER_CHOICE) return { roleKey: draft.choice };
    const customRole = normalizeCustomRole(draft.customText);
    return customRole ? { customRole } : null;
}

export function canSaveDraft(draft: RolePickerDraft, member: MemberRoleFields, maxLength: number): boolean {
    const request = buildRoleRequest(draft);
    if (!request) return false;
    if (request.customRole !== undefined) {
        return request.customRole.length <= maxLength && request.customRole !== member.customRelationshipRole;
    }
    return request.roleKey !== member.relationshipRole;
}

export function roleValueFromRequest(request: MemberRoleRequestDto): RoleValue {
    return { roleKey: request.roleKey ?? null, customRole: request.customRole ?? null };
}

export function optionLabel(option: MemberRoleOptionDto, locale: Locale): string {
    const label = option.label[locale] || option.label.en;
    return option.emoji ? `${option.emoji} ${label}` : label;
}

// A full role stays pickable for the member who already holds it.
export function isOptionDisabled(option: MemberRoleOptionDto, currentRoleKey: string | null): boolean {
    return !option.available && option.roleKey !== currentRoleKey;
}

export type RoleErrorKind = 'length' | 'blocked' | 'stale' | 'locked' | 'full' | 'featured' | 'moduleOff' | 'other';

export function roleErrorKind(error: unknown): RoleErrorKind {
    switch (getErrorCode(error)) {
        case ERROR_CODES.MEMBER_ROLE_INVALID_REQUEST:
            return 'length';
        case ERROR_CODES.MEMBER_ROLE_CUSTOM_BLOCKED:
            return 'blocked';
        case ERROR_CODES.MEMBER_ROLE_UNKNOWN:
        case ERROR_CODES.MEMBER_ROLE_CUSTOM_NOT_ALLOWED:
            return 'stale';
        case ERROR_CODES.MEMBER_ROLE_CUSTOM_LOCKED:
            return 'locked';
        case ERROR_CODES.MEMBER_ROLE_CAP_REACHED:
            return 'full';
        case ERROR_CODES.MEMBER_ROLE_FEATURED_MEMBER:
            return 'featured';
        case ERROR_CODES.MODULE_NOT_AVAILABLE:
            return 'moduleOff';
        default:
            return 'other';
    }
}

// ── Cache patching (guide §8: PUT/DELETE return 204, the client updates itself) ──

function patchAuthored(item: unknown, memberId: string, role: RoleValue): unknown {
    if (!item || typeof item !== 'object' || !('author' in item)) return item;
    const author = (item as { author: AuthorDto | null }).author;
    if (!author || author.memberId !== memberId) return item;
    return { ...item, author: { ...author, roleKey: role.roleKey, customRole: role.customRole } };
}

// Updates the author's role on a post, comment or story, on an array of them,
// or on an infinite query's pages. Anything else passes through unchanged.
export function withAuthorRole<T>(data: T, memberId: string, role: RoleValue): T {
    if (Array.isArray(data)) return data.map((item) => patchAuthored(item, memberId, role)) as T;
    if (data && typeof data === 'object' && 'pages' in data && Array.isArray((data as { pages: unknown }).pages)) {
        const infinite = data as unknown as { pages: unknown[] };
        return {
            ...infinite,
            pages: infinite.pages.map((page) => {
                const content = page && typeof page === 'object' ? (page as { content?: unknown }).content : undefined;
                return Array.isArray(content) ? { ...(page as object), content: content.map((item) => patchAuthored(item, memberId, role)) } : page;
            }),
        } as T;
    }
    return patchAuthored(data, memberId, role) as T;
}

export function withMemberRole<T extends { id: string } & MemberRoleFields>(members: T[], memberId: string, role: RoleValue): T[] {
    return members.map((member) =>
        member.id === memberId ? { ...member, relationshipRole: role.roleKey, customRelationshipRole: role.customRole } : member,
    );
}

// ── Gating ──

type RoleEvent = {
    status: EventStatus;
    deletedAt: string | null;
    suspended?: boolean;
    modules: Pick<EventModuleResponseDto, 'moduleKey' | 'isAvailable'>[];
};

function rolesWritable(event: RoleEvent | null | undefined): event is RoleEvent {
    if (!event || event.suspended || isEventDeleted(event) || event.status !== 'ACTIVE') return false;
    return isModuleAvailable(event.modules as EventModuleResponseDto[], 'member_roles');
}

export function canEditOwnRole(event: RoleEvent | null | undefined, member: Pick<EventMemberResponseDto, 'isFeatured'> | null | undefined): boolean {
    return rolesWritable(event) && member !== null && member !== undefined && !member.isFeatured;
}

export function canManageMemberRoles(event: RoleEvent | null | undefined, canModerate: boolean): boolean {
    return canModerate && rolesWritable(event);
}

// ── Sheet trigger ──

export const ROLE_SHEET_PARAM = 'sheet';
export const ROLE_SHEET_VALUE = 'role' as const;

export function withRoleSheetParam(pathname: string, search: string): string {
    const params = new URLSearchParams(search);
    params.set(ROLE_SHEET_PARAM, ROLE_SHEET_VALUE);
    return `${pathname}?${params.toString()}`;
}

export function withoutRoleSheetParam(pathname: string, search: string): string {
    const params = new URLSearchParams(search);
    params.delete(ROLE_SHEET_PARAM);
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
}

export function rolePromptStorageKey(memberId: string): string {
    return `sw.rolePrompt.${memberId}`;
}
