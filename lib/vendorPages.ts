import type { VendorPageType } from '@/i18n/publicLocale';

// The tools a vendor type uses inside an event (VendorPages.tools.*), in the order its page lists them.
export type VendorTool = 'proAlbum' | 'sneakPeek' | 'prints' | 'included' | 'schedule' | 'announce' | 'rsvpReport' | 'shareLinks' | 'liveRequests';
// What every vendor gets (VendorPages.always.*).
export const VENDOR_ALWAYS = ['listing', 'posts', 'reach', 'myPage'] as const;
// What partners get (VendorPages.partner.*). Print prices are for photographers only.
export type VendorPartnerPerk = 'discount' | 'feedCard' | 'fullReach' | 'printPrices' | 'portal';

export const VENDOR_CLIENT_PHASES = ['before', 'during', 'after'] as const;

// The photos at the end of the clients section, one per guest flow (VendorPages.strip.*).
export const VENDOR_STRIP = [
    { key: 'qr', src: '/landing/guest-scanning-the-storywall-qr-code.webp' },
    { key: 'wish', src: '/landing/guest-sharing-a-wish-in-the-storywall-guestbook.webp' },
    { key: 'invite', src: '/landing/guest-viewing-the-storywall-invitation-on-a-phone.webp' },
    { key: 'rsvp', src: '/landing/guest-confirming-the-storywall-rsvp.webp' },
] as const;

type VendorPageConfig = { heroImage: string; tools: readonly VendorTool[]; partner: readonly VendorPartnerPerk[] };

const PARTNER: readonly VendorPartnerPerk[] = ['discount', 'feedCard', 'fullReach', 'portal'];

// The vendor capabilities live on storywall.gr, per type.
export const VENDOR_PAGES: Record<VendorPageType, VendorPageConfig> = {
    PLANNER: {
        heroImage: '/landing/couple-cheering-with-guests-under-lit-arch-at-night.webp',
        tools: ['schedule', 'announce', 'rsvpReport', 'shareLinks'],
        partner: PARTNER,
    },
    VENUE: { heroImage: '/landing/04-wedding-reception-santorini.webp', tools: [], partner: PARTNER },
    PHOTOGRAPHER: {
        heroImage: '/landing/03-wedding-ceremony-santorini.webp',
        tools: ['proAlbum', 'sneakPeek', 'prints', 'included'],
        partner: ['discount', 'feedCard', 'fullReach', 'printPrices', 'portal'],
    },
    VIDEOGRAPHER: { heroImage: '/landing/friends-and-family-celebrating-at-sunset.webp', tools: ['proAlbum', 'sneakPeek'], partner: PARTNER },
    DECORATION: { heroImage: '/landing/baptism-celebration-at-the-table.webp', tools: [], partner: PARTNER },
    CATERING: { heroImage: '/landing/guests-mingling-with-champagne-at-an-elegant-vip-social-party.webp', tools: [], partner: PARTNER },
    MUSIC: { heroImage: '/landing/guests-dancing-at-an-elegant-vip-social-party-at-night.webp', tools: ['liveRequests'], partner: PARTNER },
};
