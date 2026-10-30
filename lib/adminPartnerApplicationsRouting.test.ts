import { describe, expect, it } from 'vitest';

import {
    formatPartnerApplicationsHash,
    isPartnerApplicationsHash,
    parsePartnerApplicationsHash,
    PARTNER_APPLICATIONS_HASH_ROOT,
} from '@/lib/adminPartnerApplicationsRouting';

describe('partner applications hash', () => {
    it('recognises the list and a detail page', () => {
        expect(isPartnerApplicationsHash('#applications')).toBe(true);
        expect(isPartnerApplicationsHash('#applications/a-1')).toBe(true);
        expect(isPartnerApplicationsHash('#applicationsx')).toBe(false);
        expect(isPartnerApplicationsHash('#collaborations')).toBe(false);
    });

    it('reads the id', () => {
        expect(parsePartnerApplicationsHash('#applications')).toBeNull();
        expect(parsePartnerApplicationsHash('#applications/')).toBeNull();
        expect(parsePartnerApplicationsHash('#applications/a%2F1')).toBe('a/1');
        expect(parsePartnerApplicationsHash('#applications/%E0%A4%A')).toBeNull();
        expect(parsePartnerApplicationsHash('#orders/o-1')).toBeNull();
    });

    it('writes the hash', () => {
        expect(formatPartnerApplicationsHash(null)).toBe(PARTNER_APPLICATIONS_HASH_ROOT);
        expect(formatPartnerApplicationsHash('a/1')).toBe('#applications/a%2F1');
    });
});
