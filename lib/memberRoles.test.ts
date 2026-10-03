import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api/client';
import type { MemberRoleCatalogDto } from '@/lib/api/types';
import {
    activeRoleCount,
    buildCreatePayload,
    buildPatchPayload,
    buildRoleRequest,
    canEditOwnRole,
    canManageMemberRoles,
    canSaveDraft,
    draftFromMember,
    draftFromRole,
    filterRoles,
    heldHostOnlyRole,
    hostOnlyRoleKeys,
    isOptionDisabled,
    isValidRoleKey,
    memberHasRole,
    memberRoleLabel,
    nextSortOrder,
    normalizeRoleKeyInput,
    optionLabel,
    OTHER_CHOICE,
    planRoleMove,
    roleErrorKind,
    sortRoles,
    validateRoleDraft,
    withAuthorRole,
    withMemberRole,
    withoutRoleSheetParam,
} from '@/lib/memberRoles';

function makeRole(overrides: Partial<MemberRoleCatalogDto> = {}): MemberRoleCatalogDto {
    return {
        id: 'r1',
        eventTypeKey: 'WEDDING',
        roleKey: 'BEST_MAN',
        label: { en: 'Best man', el: 'Κουμπάρος' },
        emoji: null,
        maxHolders: null,
        sortOrder: 0,
        hostOnly: false,
        retired: false,
        ...overrides,
    };
}

const CATALOG = {
    WEDDING: [
        makeRole(),
        makeRole({ id: 'r2', roleKey: 'MAID', label: { en: 'Maid of honour', el: '' }, emoji: '💐', sortOrder: 1 }),
        makeRole({ id: 'r3', roleKey: 'OLD', label: { en: 'Old', el: 'Παλιός' }, retired: true, sortOrder: 2 }),
    ],
};

describe('memberRoleLabel', () => {
    it('returns custom text as is', () => {
        expect(memberRoleLabel({ roleKey: null, customRole: 'Uncle from Melbourne', eventTypeKey: 'WEDDING', catalog: CATALOG, locale: 'el' })).toBe(
            'Uncle from Melbourne',
        );
    });

    it('resolves a catalog key in the current locale', () => {
        expect(memberRoleLabel({ roleKey: 'BEST_MAN', customRole: null, eventTypeKey: 'WEDDING', catalog: CATALOG, locale: 'el' })).toBe('Κουμπάρος');
    });

    it('falls back to English and prefixes the emoji', () => {
        expect(memberRoleLabel({ roleKey: 'MAID', customRole: null, eventTypeKey: 'WEDDING', catalog: CATALOG, locale: 'el' })).toBe('💐 Maid of honour');
    });

    it('still resolves a retired role', () => {
        expect(memberRoleLabel({ roleKey: 'OLD', customRole: null, eventTypeKey: 'WEDDING', catalog: CATALOG, locale: 'en' })).toBe('Old');
    });

    it('returns null for an unknown key, a missing event type or no role', () => {
        expect(memberRoleLabel({ roleKey: 'NOPE', customRole: null, eventTypeKey: 'WEDDING', catalog: CATALOG, locale: 'en' })).toBeNull();
        expect(memberRoleLabel({ roleKey: 'BEST_MAN', customRole: null, eventTypeKey: null, catalog: CATALOG, locale: 'en' })).toBeNull();
        expect(memberRoleLabel({ roleKey: null, customRole: null, eventTypeKey: 'WEDDING', catalog: CATALOG, locale: 'en' })).toBeNull();
    });
});

describe('activeRoleCount', () => {
    it('counts roles that are not retired', () => {
        expect(activeRoleCount(CATALOG, 'WEDDING')).toBe(2);
    });

    it('is 0 for an unknown or missing event type', () => {
        expect(activeRoleCount(CATALOG, 'BIRTHDAY')).toBe(0);
        expect(activeRoleCount(CATALOG, null)).toBe(0);
    });
});

describe('role keys', () => {
    it('uppercases input and turns spaces into underscores', () => {
        expect(normalizeRoleKeyInput('best man')).toBe('BEST_MAN');
    });

    it('accepts the backend pattern only', () => {
        expect(isValidRoleKey('BEST_MAN')).toBe(true);
        expect(isValidRoleKey('B')).toBe(false);
        expect(isValidRoleKey('1ST')).toBe(false);
        expect(isValidRoleKey(`A${'B'.repeat(50)}`)).toBe(false);
    });
});

describe('validateRoleDraft', () => {
    it('flags every bad field on create', () => {
        const draft = { roleKey: 'x', labelEn: ' ', labelEl: 'a'.repeat(41), emoji: 'e'.repeat(17), limited: true, maxHolders: '0', hostOnly: false };
        expect(validateRoleDraft(draft, true)).toEqual({ roleKey: true, labelEn: true, labelEl: true, emoji: true, maxHolders: true });
    });

    it('skips the key on edit and ignores the number when unlimited', () => {
        const draft = { roleKey: '', labelEn: 'Best man', labelEl: 'Κουμπάρος', emoji: '', limited: false, maxHolders: '', hostOnly: false };
        expect(validateRoleDraft(draft, false)).toEqual({});
    });
});

describe('buildCreatePayload', () => {
    it('trims, omits a blank emoji and an unlimited cap', () => {
        const draft = { roleKey: 'BEST_MAN', labelEn: ' Best man ', labelEl: 'Κουμπάρος', emoji: ' ', limited: false, maxHolders: '', hostOnly: false };
        expect(buildCreatePayload(draft, 'WEDDING', 3)).toEqual({
            eventTypeKey: 'WEDDING',
            roleKey: 'BEST_MAN',
            label: { en: 'Best man', el: 'Κουμπάρος' },
            sortOrder: 3,
        });
    });

    it('sends emoji and cap when set', () => {
        const draft = { roleKey: 'BEST_MAN', labelEn: 'Best man', labelEl: 'Κουμπάρος', emoji: '🤵', limited: true, maxHolders: '2', hostOnly: false };
        expect(buildCreatePayload(draft, 'WEDDING', 0)).toMatchObject({ emoji: '🤵', maxHolders: 2 });
    });

    it('sends hostOnly only when on', () => {
        const draft = { ...draftFromRole(null), roleKey: 'BEST_MAN', labelEn: 'Best man', labelEl: 'Κουμπάρος', hostOnly: true };
        expect(buildCreatePayload(draft, 'WEDDING', 0)).toMatchObject({ hostOnly: true });
    });
});

describe('buildPatchPayload', () => {
    it('sends nothing when nothing changed', () => {
        const role = makeRole({ emoji: '🤵', maxHolders: 2 });
        expect(buildPatchPayload(role, draftFromRole(role))).toEqual({});
    });

    it('clears emoji with "" and the cap with clearMaxHolders', () => {
        const role = makeRole({ emoji: '🤵', maxHolders: 2 });
        const draft = { ...draftFromRole(role), emoji: '', limited: false, maxHolders: '' };
        expect(buildPatchPayload(role, draft)).toEqual({ emoji: '', clearMaxHolders: true });
    });

    it('sends both labels when one changed, and a new cap', () => {
        const role = makeRole();
        const draft = { ...draftFromRole(role), labelEl: 'Κουμπάρος γάμου', limited: true, maxHolders: '3' };
        expect(buildPatchPayload(role, draft)).toEqual({ label: { en: 'Best man', el: 'Κουμπάρος γάμου' }, maxHolders: 3 });
    });
});

describe('sortRoles and nextSortOrder', () => {
    it('sorts by sortOrder then key, and puts new roles last', () => {
        const roles = [makeRole({ id: 'b', roleKey: 'B', sortOrder: 1 }), makeRole({ id: 'a', roleKey: 'A', sortOrder: 1 }), makeRole({ id: 'c', sortOrder: 0 })];
        expect(sortRoles(roles).map((role) => role.id)).toEqual(['c', 'a', 'b']);
        expect(nextSortOrder(roles)).toBe(2);
        expect(nextSortOrder([])).toBe(0);
    });
});

describe('filterRoles', () => {
    const roles = [makeRole(), makeRole({ id: 'r2', roleKey: 'OLD', label: { en: 'Old friend', el: 'Παλιός φίλος' }, retired: true })];

    it('filters by status', () => {
        expect(filterRoles(roles, '', 'RETIRED', 'en').map((role) => role.id)).toEqual(['r2']);
        expect(filterRoles(roles, '', 'ACTIVE', 'en').map((role) => role.id)).toEqual(['r1']);
    });

    it('matches either label or the key, ignoring case', () => {
        expect(filterRoles(roles, 'κουμπ', 'ALL', 'en').map((role) => role.id)).toEqual(['r1']);
        expect(filterRoles(roles, 'old', 'ALL', 'en').map((role) => role.id)).toEqual(['r2']);
    });
});

describe('planRoleMove', () => {
    const roles = [makeRole({ id: 'a', sortOrder: 0 }), makeRole({ id: 'b', sortOrder: 5 }), makeRole({ id: 'c', sortOrder: 9 })];

    it('swaps sortOrder with the neighbour', () => {
        expect(planRoleMove(roles, 'b', 'up')).toEqual([
            { id: 'a', sortOrder: 5 },
            { id: 'b', sortOrder: 0 },
        ]);
    });

    it('does nothing at the ends', () => {
        expect(planRoleMove(roles, 'a', 'up')).toEqual([]);
        expect(planRoleMove(roles, 'c', 'down')).toEqual([]);
    });

    it('renumbers first when two roles share a sortOrder', () => {
        const tied = [
            makeRole({ id: 'a', roleKey: 'A', sortOrder: 0 }),
            makeRole({ id: 'b', roleKey: 'B', sortOrder: 0 }),
            makeRole({ id: 'c', roleKey: 'C', sortOrder: 0 }),
        ];
        expect(planRoleMove(tied, 'c', 'up')).toEqual([
            { id: 'b', sortOrder: 2 },
            { id: 'c', sortOrder: 1 },
        ]);
    });
});

const NO_ROLE = { relationshipRole: null, customRelationshipRole: null };

describe('draftFromMember', () => {
    it('starts from the catalog role', () => {
        expect(draftFromMember({ relationshipRole: 'BEST_MAN', customRelationshipRole: null })).toEqual({ choice: 'BEST_MAN', customText: '' });
    });
    it('starts on Other with the custom text', () => {
        expect(draftFromMember({ relationshipRole: null, customRelationshipRole: 'Uncle' })).toEqual({ choice: OTHER_CHOICE, customText: 'Uncle' });
    });
    it('starts empty', () => {
        expect(draftFromMember(NO_ROLE)).toEqual({ choice: null, customText: '' });
    });
});

describe('buildRoleRequest', () => {
    it('sends the catalog key', () => {
        expect(buildRoleRequest({ choice: 'BRIDE', customText: 'x' })).toEqual({ roleKey: 'BRIDE' });
    });
    it('sends normalized custom text', () => {
        expect(buildRoleRequest({ choice: OTHER_CHOICE, customText: '  Uncle   from  Melbourne ' })).toEqual({ customRole: 'Uncle from Melbourne' });
    });
    it('sends nothing for blank Other or no choice', () => {
        expect(buildRoleRequest({ choice: OTHER_CHOICE, customText: '   ' })).toBeNull();
        expect(buildRoleRequest({ choice: null, customText: '' })).toBeNull();
    });
});

describe('canSaveDraft', () => {
    it('needs a change', () => {
        expect(canSaveDraft({ choice: 'BRIDE', customText: '' }, { relationshipRole: 'BRIDE', customRelationshipRole: null }, 40)).toBe(false);
        expect(canSaveDraft({ choice: 'GROOM', customText: '' }, { relationshipRole: 'BRIDE', customRelationshipRole: null }, 40)).toBe(true);
        expect(canSaveDraft({ choice: OTHER_CHOICE, customText: 'Uncle' }, { relationshipRole: null, customRelationshipRole: 'Uncle' }, 40)).toBe(false);
    });
    it('rejects custom text over the limit', () => {
        expect(canSaveDraft({ choice: OTHER_CHOICE, customText: 'x'.repeat(41) }, NO_ROLE, 40)).toBe(false);
    });
    it('switching from custom text to a catalog role is a change', () => {
        expect(canSaveDraft({ choice: 'BRIDE', customText: '' }, { relationshipRole: null, customRelationshipRole: 'Uncle' }, 40)).toBe(true);
    });
});

describe('memberHasRole', () => {
    it('is true for either kind', () => {
        expect(memberHasRole(NO_ROLE)).toBe(false);
        expect(memberHasRole({ relationshipRole: 'BRIDE', customRelationshipRole: null })).toBe(true);
        expect(memberHasRole({ relationshipRole: null, customRelationshipRole: 'x' })).toBe(true);
    });
});

const OPTION = { roleKey: 'BEST_MAN', label: { en: 'Best man', el: 'Κουμπάρος' }, emoji: '🥂', maxHolders: 2, holders: 2, available: false };

describe('options', () => {
    it('labels in the locale with the emoji', () => {
        expect(optionLabel(OPTION, 'el')).toBe('🥂 Κουμπάρος');
        expect(optionLabel({ ...OPTION, emoji: null, label: { en: 'Best man', el: '' } }, 'el')).toBe('Best man');
    });
    it('disables a full role unless it is the current one', () => {
        expect(isOptionDisabled(OPTION, null)).toBe(true);
        expect(isOptionDisabled(OPTION, 'BEST_MAN')).toBe(false);
        expect(isOptionDisabled({ ...OPTION, available: true }, null)).toBe(false);
    });
});

describe('host-only roles', () => {
    const catalog = { WEDDING: [makeRole({ hostOnly: true }), makeRole({ id: 'r2', roleKey: 'FRIEND' }), makeRole({ id: 'r3', roleKey: 'OLD', hostOnly: true, retired: true })] };
    const option = { roleKey: 'FRIEND', label: { en: 'Friend', el: 'Φίλος' }, emoji: null, maxHolders: null, holders: 0, available: true };

    it('lists the host-only keys of the event type', () => {
        expect([...hostOnlyRoleKeys(catalog, 'WEDDING')]).toEqual(['BEST_MAN', 'OLD']);
        expect(hostOnlyRoleKeys(catalog, null).size).toBe(0);
    });

    it('finds a held host-only role missing from the options', () => {
        expect(heldHostOnlyRole({ roleKey: 'BEST_MAN', options: [option], catalog, eventTypeKey: 'WEDDING' })?.roleKey).toBe('BEST_MAN');
        expect(heldHostOnlyRole({ roleKey: 'FRIEND', options: [option], catalog, eventTypeKey: 'WEDDING' })).toBeNull();
        expect(heldHostOnlyRole({ roleKey: 'OLD', options: [option], catalog, eventTypeKey: 'WEDDING' })).toBeNull();
        expect(heldHostOnlyRole({ roleKey: 'BEST_MAN', options: null, catalog, eventTypeKey: 'WEDDING' })).toBeNull();
    });

    it('patches hostOnly only when it changes', () => {
        const role = makeRole();
        expect(buildPatchPayload(role, { ...draftFromRole(role), hostOnly: true })).toEqual({ hostOnly: true });
    });
});

describe('roleErrorKind', () => {
    const error = (status: number, errorCode: number) => new ApiError(status, { errorCode });
    it('maps every role code', () => {
        expect(roleErrorKind(error(400, 3040))).toBe('length');
        expect(roleErrorKind(error(400, 3042))).toBe('blocked');
        expect(roleErrorKind(error(400, 3041))).toBe('stale');
        expect(roleErrorKind(error(403, 4016))).toBe('stale');
        expect(roleErrorKind(error(403, 4017))).toBe('locked');
        expect(roleErrorKind(error(403, 4018))).toBe('stale');
        expect(roleErrorKind(error(409, 5114))).toBe('full');
        expect(roleErrorKind(error(409, 5113))).toBe('featured');
        expect(roleErrorKind(error(409, 5012))).toBe('moduleOff');
        expect(roleErrorKind(error(409, 5014))).toBe('other');
        expect(roleErrorKind(new Error('x'))).toBe('other');
    });
});

const ROLE = { roleKey: 'BRIDE', customRole: null };
const author = (memberId: string) => ({ memberId, displayName: 'A', nickname: null, role: 'MEMBER' as const, avatarUrl: null, roleKey: null, customRole: null });

describe('withAuthorRole', () => {
    it('patches a single item', () => {
        expect(withAuthorRole({ id: 'p1', author: author('m1') }, 'm1', ROLE).author.roleKey).toBe('BRIDE');
    });
    it('leaves other authors and authorless items alone', () => {
        const item = { id: 'p1', author: author('m2') };
        expect(withAuthorRole(item, 'm1', ROLE)).toBe(item);
        const media = { id: 'x' };
        expect(withAuthorRole(media, 'm1', ROLE)).toBe(media);
    });
    it('patches arrays and infinite pages', () => {
        expect(withAuthorRole([{ author: author('m1') }], 'm1', ROLE)[0].author.roleKey).toBe('BRIDE');
        const infinite = { pages: [{ content: [{ author: author('m1') }, { author: author('m2') }] }], pageParams: [0] };
        const patched = withAuthorRole(infinite, 'm1', ROLE);
        expect(patched.pages[0].content[0].author.roleKey).toBe('BRIDE');
        expect(patched.pages[0].content[1].author.roleKey).toBeNull();
        expect(patched.pageParams).toEqual([0]);
    });
    it('passes undefined through', () => {
        expect(withAuthorRole(undefined, 'm1', ROLE)).toBeUndefined();
    });
});

describe('withMemberRole', () => {
    it('updates only that member', () => {
        const members = [
            { id: 'm1', ...NO_ROLE },
            { id: 'm2', ...NO_ROLE },
        ];
        const result = withMemberRole(members, 'm1', { roleKey: null, customRole: 'Uncle' });
        expect(result[0]).toEqual({ id: 'm1', relationshipRole: null, customRelationshipRole: 'Uncle' });
        expect(result[1]).toBe(members[1]);
    });
});

const liveEvent = {
    status: 'ACTIVE' as const,
    deletedAt: null,
    suspended: false,
    modules: [{ moduleKey: 'member_roles', isEnabled: true, isAvailable: true }],
};

describe('gating', () => {
    it('lets a non-featured member of a live event with the module edit their role', () => {
        expect(canEditOwnRole(liveEvent, { isFeatured: false })).toBe(true);
    });
    it('blocks featured members, drafts, deleted, suspended and module-off events', () => {
        expect(canEditOwnRole(liveEvent, { isFeatured: true })).toBe(false);
        expect(canEditOwnRole({ ...liveEvent, status: 'DRAFT' }, { isFeatured: false })).toBe(false);
        expect(canEditOwnRole({ ...liveEvent, deletedAt: '2026-01-01T00:00:00Z' }, { isFeatured: false })).toBe(false);
        expect(canEditOwnRole({ ...liveEvent, suspended: true }, { isFeatured: false })).toBe(false);
        expect(canEditOwnRole({ ...liveEvent, modules: [] }, { isFeatured: false })).toBe(false);
        expect(canEditOwnRole(null, { isFeatured: false })).toBe(false);
        expect(canEditOwnRole(liveEvent, null)).toBe(false);
    });
    it('lets moderators of a live event manage roles', () => {
        expect(canManageMemberRoles(liveEvent, true)).toBe(true);
        expect(canManageMemberRoles(liveEvent, false)).toBe(false);
        expect(canManageMemberRoles({ ...liveEvent, modules: [] }, true)).toBe(false);
    });
});

describe('role sheet URL', () => {
    it('removes the trigger, keeping other params', () => {
        expect(withoutRoleSheetParam('/events/e1/feed', 'post=p1&sheet=role')).toBe('/events/e1/feed?post=p1');
        expect(withoutRoleSheetParam('/events/e1/feed', 'sheet=role')).toBe('/events/e1/feed');
    });
});
