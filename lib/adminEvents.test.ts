import { describe, expect, it } from 'vitest';

import {
    adminEventsPath,
    adminEventState,
    closeRequest,
    EMPTY_EVENT_FILTERS,
    EMPTY_RESTRICTION_DRAFT,
    eventModuleRows,
    formatEventsHash,
    gbToBytes,
    isGrantReasonValid,
    isStorageGrantBelowUsage,
    MAX_EXTRA_MEMBER_SLOTS,
    memberLimitWithSlots,
    parseEventsHash,
    parseMemberSlots,
    storageLimitWithGrant,
    suspendRequest,
    usageRatio,
} from '@/lib/adminEvents';
import type { AdminEventDetailDto } from '@/lib/api/types';

const GB = 1024 ** 3;
const EXPLANATION = 'Repeated insults aimed at one guest.';

const usage: AdminEventDetailDto['usage'] = {
    storageBytes: 9 * GB,
    planStorageBytes: 5 * GB,
    purchasedExtraStorageBytes: 2 * GB,
    grantedStorageBytes: 3 * GB,
    storageLimitBytes: 10 * GB,
    memberCount: 40,
    planMaxMembers: 50,
    extraMemberSlots: 0,
    memberLimit: 50,
};

describe('events hash', () => {
    it('reads the event id and round-trips it', () => {
        expect(parseEventsHash('#events')).toBeNull();
        expect(parseEventsHash('#events/')).toBeNull();
        expect(parseEventsHash('#orders/e-1')).toBeNull();
        expect(parseEventsHash(formatEventsHash('a b/c'))).toBe('a b/c');
        expect(formatEventsHash(null)).toBe('#events');
    });

    it('ignores a malformed id', () => {
        expect(parseEventsHash('#events/%E0%A4%A')).toBeNull();
    });
});

describe('adminEventState', () => {
    const base = { status: 'ACTIVE' as const, suspendedAt: null, closedAt: null, deletedAt: null };

    it('ranks closed over suspended over deleted over status', () => {
        expect(adminEventState(base)).toBe('ACTIVE');
        expect(adminEventState({ ...base, deletedAt: 'x' })).toBe('DELETED');
        expect(adminEventState({ ...base, deletedAt: 'x', suspendedAt: 'x' })).toBe('SUSPENDED');
        expect(adminEventState({ ...base, suspendedAt: 'x', closedAt: 'x' })).toBe('CLOSED');
    });
});

describe('adminEventsPath', () => {
    it('sends only the filters that are set', () => {
        expect(adminEventsPath(EMPTY_EVENT_FILTERS, 0, 50)).toMatch(/\?page=0&size=50$/);
        const path = adminEventsPath({ ...EMPTY_EVENT_FILTERS, restriction: 'NOT_SUSPENDED', hostUserId: 'u-1', q: '  party ' }, 2, 5);
        expect(path).toContain('suspended=false');
        expect(path).toContain('hostUserId=u-1');
        expect(path).toContain('q=party');
    });
});

describe('gbToBytes', () => {
    it('accepts whole and decimal GB, with a comma too', () => {
        expect(gbToBytes('0')).toBe(0);
        expect(gbToBytes(' 2 ')).toBe(2 * GB);
        expect(gbToBytes('1,5')).toBe(1.5 * GB);
    });

    it('refuses what the server would', () => {
        expect(gbToBytes('')).toBeNull();
        expect(gbToBytes('-1')).toBeNull();
        expect(gbToBytes('1e3')).toBeNull();
        expect(gbToBytes('10241')).toBeNull();
    });
});

describe('parseMemberSlots', () => {
    it('takes whole numbers up to the ceiling', () => {
        expect(parseMemberSlots('0')).toBe(0);
        expect(parseMemberSlots(String(MAX_EXTRA_MEMBER_SLOTS))).toBe(MAX_EXTRA_MEMBER_SLOTS);
        expect(parseMemberSlots(String(MAX_EXTRA_MEMBER_SLOTS + 1))).toBeNull();
        expect(parseMemberSlots('2.5')).toBeNull();
        expect(parseMemberSlots('-3')).toBeNull();
    });
});

describe('grant previews', () => {
    it('adds a grant on top of plan and purchases', () => {
        expect(storageLimitWithGrant(usage, GB)).toBe(8 * GB);
        expect(storageLimitWithGrant({ ...usage, planStorageBytes: null }, GB)).toBeNull();
        expect(memberLimitWithSlots(usage, 10)).toBe(60);
        expect(memberLimitWithSlots({ ...usage, planMaxMembers: null }, 10)).toBeNull();
    });

    it('flags only a lowered grant that leaves the event over its limit', () => {
        expect(isStorageGrantBelowUsage(usage, GB)).toBe(true);
        expect(isStorageGrantBelowUsage(usage, 2 * GB)).toBe(false);
        expect(isStorageGrantBelowUsage({ ...usage, grantedStorageBytes: 0 }, 0)).toBe(false);
    });

    it('needs a reason', () => {
        expect(isGrantReasonValid('   ')).toBe(false);
        expect(isGrantReasonValid('Goodwill for an outage')).toBe(true);
        expect(isGrantReasonValid('x'.repeat(501))).toBe(false);
    });
});

describe('restriction requests', () => {
    const policy = { ...EMPTY_RESTRICTION_DRAFT, rule: 'HARASSMENT' as const, explanation: `  ${EXPLANATION}  `, note: '  ' };

    it('builds a suspension with a trimmed explanation and no blank note', () => {
        expect(suspendRequest(policy)).toEqual({ ground: 'GUIDELINES_BREACH', rule: 'HARASSMENT', explanation: EXPLANATION, note: null });
        expect(suspendRequest({ ...policy, rule: null })).toBeNull();
        expect(suspendRequest({ ...policy, explanation: 'Too short' })).toBeNull();
    });

    it('sends exactly one kind of reason when closing', () => {
        expect(closeRequest('POLICY', { ...policy, operationalReason: 'DUPLICATE' })).toMatchObject({ rule: 'HARASSMENT', operationalReason: null });
        expect(closeRequest('OPERATIONAL', { ...policy, operationalReason: 'DUPLICATE' })).toMatchObject({
            ground: null,
            rule: null,
            operationalReason: 'DUPLICATE',
        });
        expect(closeRequest('OPERATIONAL', policy)).toBeNull();
    });
});

describe('eventModuleRows', () => {
    it('attaches a grant by key, even under a plan module', () => {
        const rows = eventModuleRows({
            modules: [
                { moduleKey: 'GALLERY', enabled: true, source: 'PLAN' },
                { moduleKey: 'MUSIC', enabled: false, source: 'NONE' },
            ],
            moduleGrants: [{ moduleKey: 'GALLERY', reason: 'Kept on after a downgrade', grantedByUserId: 'a-1', grantedAt: '2026-10-01T10:00:00Z' }],
        });
        expect(rows[0].grant?.reason).toBe('Kept on after a downgrade');
        expect(rows[1].grant).toBeNull();
    });
});

describe('usageRatio', () => {
    it('is zero for unlimited and empty limits', () => {
        expect(usageRatio(5, null)).toBe(0);
        expect(usageRatio(5, 0)).toBe(0);
        expect(usageRatio(5, 10)).toBe(0.5);
    });
});
