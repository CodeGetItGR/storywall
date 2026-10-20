import { describe, expect, it } from 'vitest';

import type { VendorMeDto } from '@/lib/api/types';
import { SITE_URL } from '@/lib/seo';
import {
    capabilitiesOfType,
    hasVendorCapability,
    isValidVendorLink,
    listedVendors,
    proStorageState,
    VENDOR_TYPES,
    vendorApplySearch,
    vendorInviteUrl,
} from '@/lib/vendors';

function me(overrides: Partial<VendorMeDto> = {}): VendorMeDto {
    return {
        vendorId: 'v1',
        vendorType: 'PLANNER',
        capabilities: ['ANNOUNCE', 'QR_READ', 'RSVP_REPORT', 'SCHEDULE_EDIT'],
        accessEndsAt: '2027-07-12T00:00:00Z',
        accessOpen: true,
        profileComplete: true,
        showPartnerPrompt: false,
        proStorageBytes: null,
        proUsedBytes: null,
        optedOut: false,
        hiddenByHost: false,
        toolsOff: null,
        ...overrides,
    };
}

describe('VENDOR_TYPES', () => {
    it('lists the eight partner roles once each', () => {
        expect(VENDOR_TYPES).toEqual(['PLANNER', 'VENUE', 'PHOTOGRAPHER', 'VIDEOGRAPHER', 'DECORATION', 'CATERING', 'MUSIC', 'OTHER']);
    });
});

describe('hasVendorCapability', () => {
    it('is true for a listed capability while access is open', () => {
        expect(hasVendorCapability(me(), 'ANNOUNCE')).toBe(true);
    });

    it('is false for a capability the type lacks', () => {
        expect(hasVendorCapability(me(), 'PRO_ALBUM')).toBe(false);
    });

    it('is false once access has closed', () => {
        expect(hasVendorCapability(me({ accessOpen: false }), 'ANNOUNCE')).toBe(false);
    });

    it('is false while the tools are off and the list is empty', () => {
        expect(hasVendorCapability(me({ accessOpen: false, capabilities: [], toolsOff: 'MODULE_OFF' }), 'ANNOUNCE')).toBe(false);
    });

    it('is false for someone who is not a vendor', () => {
        expect(hasVendorCapability(null, 'ANNOUNCE')).toBe(false);
        expect(hasVendorCapability(undefined, 'ANNOUNCE')).toBe(false);
    });
});

describe('capabilitiesOfType', () => {
    it('gives a planner the four planner tools', () => {
        expect([...capabilitiesOfType('PLANNER')].sort()).toEqual(['ANNOUNCE', 'QR_READ', 'RSVP_REPORT', 'SCHEDULE_EDIT']);
    });

    it('gives photographers and videographers the Pro album', () => {
        expect(capabilitiesOfType('PHOTOGRAPHER')).toEqual(['PRO_ALBUM']);
        expect(capabilitiesOfType('VIDEOGRAPHER')).toEqual(['PRO_ALBUM']);
    });

    it('gives music the song requests', () => {
        expect(capabilitiesOfType('MUSIC')).toEqual(['SONG_REQUESTS']);
    });

    it('gives the other types no tools', () => {
        for (const type of ['VENUE', 'DECORATION', 'CATERING', 'OTHER'] as const) expect(capabilitiesOfType(type)).toEqual([]);
    });
});

describe('vendorInviteUrl', () => {
    it('is the site URL plus the invite path', () => {
        expect(vendorInviteUrl('tok')).toBe(`${SITE_URL}/invite/tok`);
    });
});

describe('vendorApplySearch', () => {
    it('carries the source and the type, nothing personal', () => {
        expect(vendorApplySearch('PHOTOGRAPHER')).toBe('?utm_source=storywall-vendor&utm_medium=PHOTOGRAPHER');
    });
});

describe('isValidVendorLink', () => {
    it('accepts an https URL or an @handle', () => {
        expect(isValidVendorLink('https://studio.gr')).toBe(true);
        expect(isValidVendorLink('@studio.x')).toBe(true);
    });

    it('refuses http, bare words and long handles', () => {
        expect(isValidVendorLink('http://studio.gr')).toBe(false);
        expect(isValidVendorLink('studio')).toBe(false);
        expect(isValidVendorLink(`@${'a'.repeat(61)}`)).toBe(false);
        expect(isValidVendorLink('https://studio.gr/a b')).toBe(false);
    });
});

describe('listedVendors', () => {
    it('drops hidden, opted-out and profile-less rows', () => {
        const base = { memberId: 'm', vendorType: 'MUSIC' as const, link: '@x', logoUrl: null, joinedAt: '2026-10-01T00:00:00Z' };
        const rows = [
            { ...base, id: 'a', businessName: 'A' },
            { ...base, id: 'b', businessName: 'B', hiddenByHost: true },
            { ...base, id: 'c', businessName: 'C', optedOut: true },
            { ...base, id: 'd', businessName: null },
        ];
        expect(listedVendors(rows).map((row) => row.id)).toEqual(['a']);
    });
});

describe('proStorageState', () => {
    const GB = 1024 ** 3;

    it('is below the allowance', () => {
        expect(proStorageState(1 * GB, 5 * GB)).toEqual({ state: 'below', percent: 20, overflowBytes: 0 });
    });

    it('is exactly at the allowance', () => {
        expect(proStorageState(5 * GB, 5 * GB)).toEqual({ state: 'at', percent: 100, overflowBytes: 0 });
    });

    it('is over the allowance and reports the overflow', () => {
        expect(proStorageState(6 * GB, 5 * GB)).toEqual({ state: 'over', percent: 100, overflowBytes: 1 * GB });
    });

    it('treats a zero allowance as all overflow', () => {
        expect(proStorageState(2 * GB, 0)).toEqual({ state: 'over', percent: 100, overflowBytes: 2 * GB });
        expect(proStorageState(0, 0)).toEqual({ state: 'at', percent: 100, overflowBytes: 0 });
    });

    it('treats a missing allowance or use like zero and never returns NaN', () => {
        expect(proStorageState(2 * GB, null)).toEqual({ state: 'over', percent: 100, overflowBytes: 2 * GB });
        expect(proStorageState(2 * GB, undefined)).toEqual({ state: 'over', percent: 100, overflowBytes: 2 * GB });
        expect(proStorageState(null, null)).toEqual({ state: 'at', percent: 100, overflowBytes: 0 });
        expect(proStorageState(undefined, 5 * GB)).toEqual({ state: 'below', percent: 0, overflowBytes: 0 });
    });
});
