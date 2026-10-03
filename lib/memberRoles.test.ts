import { describe, expect, it } from 'vitest';

import type { MemberRoleCatalogDto } from '@/lib/api/types';
import {
    activeRoleCount,
    buildCreatePayload,
    buildPatchPayload,
    draftFromRole,
    filterRoles,
    isValidRoleKey,
    memberRoleLabel,
    nextSortOrder,
    normalizeRoleKeyInput,
    planRoleMove,
    sortRoles,
    validateRoleDraft,
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
        const draft = { roleKey: 'x', labelEn: ' ', labelEl: 'a'.repeat(41), emoji: 'e'.repeat(17), limited: true, maxHolders: '0' };
        expect(validateRoleDraft(draft, true)).toEqual({ roleKey: true, labelEn: true, labelEl: true, emoji: true, maxHolders: true });
    });

    it('skips the key on edit and ignores the number when unlimited', () => {
        const draft = { roleKey: '', labelEn: 'Best man', labelEl: 'Κουμπάρος', emoji: '', limited: false, maxHolders: '' };
        expect(validateRoleDraft(draft, false)).toEqual({});
    });
});

describe('buildCreatePayload', () => {
    it('trims, omits a blank emoji and an unlimited cap', () => {
        const draft = { roleKey: 'BEST_MAN', labelEn: ' Best man ', labelEl: 'Κουμπάρος', emoji: ' ', limited: false, maxHolders: '' };
        expect(buildCreatePayload(draft, 'WEDDING', 3)).toEqual({
            eventTypeKey: 'WEDDING',
            roleKey: 'BEST_MAN',
            label: { en: 'Best man', el: 'Κουμπάρος' },
            sortOrder: 3,
        });
    });

    it('sends emoji and cap when set', () => {
        const draft = { roleKey: 'BEST_MAN', labelEn: 'Best man', labelEl: 'Κουμπάρος', emoji: '🤵', limited: true, maxHolders: '2' };
        expect(buildCreatePayload(draft, 'WEDDING', 0)).toMatchObject({ emoji: '🤵', maxHolders: 2 });
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
