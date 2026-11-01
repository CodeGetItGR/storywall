import { describe, expect, it } from 'vitest';

import type { VendorMeDto } from '@/lib/api/types';
import { SITE_URL } from '@/lib/seo';
import {
    capabilitiesOfType,
    hasProAllowance,
    hasVendorCapability,
    instagramHandle,
    instagramHref,
    isValidVendorEmail,
    isValidVendorPhone,
    isValidVendorWebsite,
    isVendorPageSection,
    listedVendors,
    proStorageState,
    serviceTagsForType,
    sortByVendorType,
    VENDOR_TYPES,
    vendorApplySearch,
    vendorCardActions,
    vendorInviteUrl,
    vendorQuickActions,
    vendorToolLinks,
    websiteHref,
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
        approvedPartner: false,
        sneakPeek: null,
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

    it('gives photographers and videographers the Pro album and the sneak peek', () => {
        expect(capabilitiesOfType('PHOTOGRAPHER')).toEqual(['PRO_ALBUM', 'PRINT_PICKS', 'SNEAK_PEEK']);
        expect(capabilitiesOfType('VIDEOGRAPHER')).toEqual(['PRO_ALBUM', 'SNEAK_PEEK']);
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

describe('instagramHandle', () => {
    it('takes a handle with or without the @, or a profile address', () => {
        expect(instagramHandle('@studio.x')).toBe('studio.x');
        expect(instagramHandle(' studio_x ')).toBe('studio_x');
        expect(instagramHandle('https://www.instagram.com/studio.x/?hl=el')).toBe('studio.x');
    });

    it('refuses anything else', () => {
        expect(instagramHandle('https://instagram.com/p/abc/xyz')).toBeNull();
        expect(instagramHandle('bad handle')).toBeNull();
        expect(instagramHandle(`@${'a'.repeat(61)}`)).toBeNull();
    });
});

describe('website, phone and email rules', () => {
    it('take https sites, phone numbers and emails only', () => {
        expect(isValidVendorWebsite('https://studio.gr')).toBe(true);
        expect(isValidVendorWebsite('http://studio.gr')).toBe(false);
        expect(isValidVendorWebsite('https://studio.gr/a b')).toBe(false);
        expect(isValidVendorPhone('+30 210 123 4567')).toBe(true);
        expect(isValidVendorPhone('call me')).toBe(false);
        expect(isValidVendorEmail('hi@studio.gr')).toBe(true);
        expect(isValidVendorEmail('hi@studio')).toBe(false);
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

describe('sortByVendorType', () => {
    it('orders rows like VENDOR_TYPES and leaves the input as it was', () => {
        const rows = [{ vendorType: 'MUSIC' as const }, { vendorType: 'PLANNER' as const }, { vendorType: 'PHOTOGRAPHER' as const }];
        expect(sortByVendorType(rows).map((row) => row.vendorType)).toEqual(['PLANNER', 'PHOTOGRAPHER', 'MUSIC']);
        expect(rows[0].vendorType).toBe('MUSIC');
    });
});

describe('instagramHref and websiteHref', () => {
    it('open a handle on Instagram and an https site as it is', () => {
        expect(instagramHref('studio.x')).toBe('https://instagram.com/studio.x');
        expect(websiteHref(' https://studio.gr ')).toBe('https://studio.gr');
    });

    it('open nothing for anything else', () => {
        expect(instagramHref(null)).toBeNull();
        expect(instagramHref('bad handle')).toBeNull();
        expect(websiteHref('javascript:alert(1)')).toBeNull();
        expect(websiteHref('http://studio.gr')).toBeNull();
        expect(websiteHref(null)).toBeNull();
    });
});

describe('serviceTagsForType', () => {
    it('keeps the type’s own tags, each once, in order, at most five', () => {
        expect(serviceTagsForType(['DJ', 'DRONE', 'DJ', 'SOUND'], 'MUSIC')).toEqual(['DJ', 'SOUND']);
        expect(serviceTagsForType(['DJ', 'LIVE_MUSIC', 'SOUND', 'LIGHTING', 'CHURCH', 'DANCE_FLOOR'], 'MUSIC')).toHaveLength(5);
        expect(serviceTagsForType(undefined, 'OTHER')).toEqual([]);
    });
});

describe('hasProAllowance', () => {
    it('is true only when the usage carries a Pro allowance', () => {
        expect(hasProAllowance({ proStorageBytes: 5 })).toBe(true);
        expect(hasProAllowance({ proStorageBytes: 0 })).toBe(false);
        expect(hasProAllowance({})).toBe(false);
        expect(hasProAllowance(null)).toBe(false);
    });
});

describe('vendorToolLinks', () => {
    it('lists a planner’s four tools in a fixed order', () => {
        expect(vendorToolLinks('e1', me()).map((tool) => tool.key)).toEqual(['schedule', 'announcement', 'rsvpReport', 'qr']);
        expect(vendorToolLinks('e1', me()).find((tool) => tool.key === 'rsvpReport')?.href).toBe(
            '/events/e1/manage/rsvp/reports/FULL_LIST?from=vendor',
        );
    });

    it('gives the DJ the live list and a photographer nothing (their tool is on the page)', () => {
        expect(vendorToolLinks('e1', me({ vendorType: 'MUSIC', capabilities: ['SONG_REQUESTS'] })).map((tool) => tool.key)).toEqual(['liveRequests']);
        expect(vendorToolLinks('e1', me({ vendorType: 'PHOTOGRAPHER', capabilities: ['PRO_ALBUM'] }))).toEqual([]);
    });

    it('adds no link for print picks (it is a section of the vendor page)', () => {
        expect(vendorToolLinks('e1', me({ vendorType: 'PHOTOGRAPHER', capabilities: ['PRO_ALBUM', 'PRINT_PICKS'] }))).toEqual([]);
    });

    it('lists nothing once access has closed', () => {
        expect(vendorToolLinks('e1', me({ accessOpen: false }))).toEqual([]);
    });

    it('leaves out tools whose module is off', () => {
        expect(vendorToolLinks('e1', me(), new Set(['gallery'])).map((tool) => tool.key)).toEqual(['schedule', 'announcement', 'qr']);
        expect(
            vendorToolLinks('e1', me({ vendorType: 'MUSIC', capabilities: ['SONG_REQUESTS'] }), new Set(['playlist'])).map((tool) => tool.key),
        ).toEqual(['liveRequests']);
    });
});

describe('vendorQuickActions', () => {
    const allModules = new Set(['vendors', 'gallery', 'posts', 'rsvp', 'playlist']);
    const started = '2027-07-01T18:00:00Z';
    const now = new Date('2027-07-02T00:00:00Z');
    const photographer = (overrides: Partial<VendorMeDto> = {}) =>
        me({
            vendorType: 'PHOTOGRAPHER',
            capabilities: ['PRO_ALBUM', 'SNEAK_PEEK', 'PRINT_PICKS'],
            sneakPeek: { postId: null, mediaIds: [], content: null, used: false },
            ...overrides,
        });
    const keys = (actions: { key: string }[]) => actions.map((action) => action.key);

    it('gives a photographer the Pro album, sneak peek and print order, each opening its section', () => {
        const actions = vendorQuickActions('e1', photographer(), allModules, started, now);
        expect(keys(actions)).toEqual(['proAlbum', 'sneakPeek', 'prints']);
        expect(actions[1].href).toBe('/events/e1/tools/vendors/me?section=sneakPeek');
    });

    it('drops the sneak peek before the event starts, once posted or used, and without posts', () => {
        expect(keys(vendorQuickActions('e1', photographer(), allModules, '2027-07-03T00:00:00Z', now))).not.toContain('sneakPeek');
        const posted = photographer({ sneakPeek: { postId: 'p1', mediaIds: ['m1'], content: null, used: true } });
        expect(keys(vendorQuickActions('e1', posted, allModules, started, now))).not.toContain('sneakPeek');
        expect(keys(vendorQuickActions('e1', photographer(), new Set(['vendors', 'gallery']), started, now))).toEqual(['proAlbum', 'prints']);
    });

    it('hides the Pro album without the gallery module', () => {
        expect(keys(vendorQuickActions('e1', photographer(), new Set(['vendors', 'posts']), started, now))).toEqual(['prints']);
    });

    it('lists a planner’s tools after any page sections, and nothing once access closes', () => {
        expect(keys(vendorQuickActions('e1', me(), allModules, started, now))).toEqual(['schedule', 'announcement', 'rsvpReport', 'qr']);
        expect(vendorQuickActions('e1', me({ accessOpen: false }), allModules, started, now)).toEqual([]);
        expect(vendorQuickActions('e1', photographer({ accessOpen: false }), allModules, started, now)).toEqual([]);
    });

    it('gives a type without tools nothing', () => {
        expect(vendorQuickActions('e1', me({ vendorType: 'CATERING', capabilities: [] }), allModules, started, now)).toEqual([]);
    });
});

describe('isVendorPageSection', () => {
    it('accepts only the page sections', () => {
        expect(isVendorPageSection('prints')).toBe(true);
        expect(isVendorPageSection('schedule')).toBe(false);
        expect(isVendorPageSection(null)).toBe(false);
    });
});

describe('vendorCardActions', () => {
    it('lists Instagram, website, call and email in that order', () => {
        expect(vendorCardActions({ instagram: 'studio.x', website: 'https://studio.gr', phone: '+30 210 123-4567', email: 'hi@studio.gr' })).toEqual([
            { kind: 'instagram', href: 'https://instagram.com/studio.x' },
            { kind: 'website', href: 'https://studio.gr' },
            { kind: 'call', href: 'tel:+302101234567' },
            { kind: 'email', href: 'mailto:hi@studio.gr' },
        ]);
    });

    it('leaves out what is missing or unsafe to open', () => {
        expect(vendorCardActions({ website: 'javascript:alert(1)', phone: 'call me', email: null })).toEqual([]);
    });
});
