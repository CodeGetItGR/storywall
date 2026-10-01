import { describe, expect, it } from 'vitest';

import { formatCollaborationsHash, isCollaborationsHash, parseCollaborationsHash } from '@/lib/adminCollaborationsRouting';

describe('isCollaborationsHash', () => {
    it('matches the root and sub-routes only', () => {
        expect(isCollaborationsHash('#collaborations')).toBe(true);
        expect(isCollaborationsHash('#collaborations/abc')).toBe(true);
        expect(isCollaborationsHash('#collaborationsX')).toBe(false);
        expect(isCollaborationsHash('#plans')).toBe(false);
    });
});

describe('parseCollaborationsHash', () => {
    it('returns null without an id', () => {
        expect(parseCollaborationsHash('#collaborations')).toBeNull();
        expect(parseCollaborationsHash('#collaborations/')).toBeNull();
    });

    it('reads and decodes the id', () => {
        expect(parseCollaborationsHash('#collaborations/3fa4-9c1e')).toBe('3fa4-9c1e');
        expect(parseCollaborationsHash('#collaborations/a%20b')).toBe('a b');
    });

    it('returns null for a malformed escape', () => {
        expect(parseCollaborationsHash('#collaborations/%E0%A4%A')).toBeNull();
    });

    it('ignores other sections', () => {
        expect(parseCollaborationsHash('#plans/WEDDING')).toBeNull();
    });
});

describe('formatCollaborationsHash', () => {
    it('formats the root and an id', () => {
        expect(formatCollaborationsHash(null)).toBe('#collaborations');
        expect(formatCollaborationsHash('3fa4')).toBe('#collaborations/3fa4');
    });

    it('round-trips through parse', () => {
        expect(parseCollaborationsHash(formatCollaborationsHash('a b'))).toBe('a b');
    });
});
