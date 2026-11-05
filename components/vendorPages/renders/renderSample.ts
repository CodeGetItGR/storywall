import type { VendorPageType } from '@/i18n/publicLocale';
import type { VendorServiceTag } from '@/lib/api/types';

// The sample wedding's date, in the renders that show one.
export const VENDOR_RENDER_DATE = '2027-07-17';

// Sample photos, for the renders that show someone's work.
export const VENDOR_RENDER_PHOTOS = [
    '/landing/03-wedding-ceremony-santorini.webp',
    '/landing/couple-cheering-with-guests-under-lit-arch-at-night.webp',
    '/landing/04-wedding-reception-santorini.webp',
    '/landing/02-bride-preparation-santorini.webp',
    '/landing/friends-and-family-celebrating-at-sunset.webp',
    '/landing/guests-dancing-at-an-elegant-vip-social-party-at-night.webp',
    '/landing/guests-mingling-with-champagne-at-an-elegant-vip-social-party.webp',
    '/landing/baptism-celebration-at-the-table.webp',
    '/landing/baptism-ceremony-inside-the-church.webp',
];

// The services on a sample vendor's card.
export const VENDOR_RENDER_TAGS: Record<VendorPageType, readonly VendorServiceTag[]> = {
    PLANNER: ['FULL_PLANNING', 'DAY_COORDINATION', 'DESTINATION'],
    VENUE: ['OUTDOOR', 'SEASIDE', 'PARKING'],
    PHOTOGRAPHER: ['ALBUM', 'PRINTS', 'DRONE'],
    VIDEOGRAPHER: ['HIGHLIGHTS', 'FULL_FILM', 'DRONE'],
    DECORATION: ['FLOWERS', 'TABLES', 'CHURCH'],
    CATERING: ['BUFFET', 'CAKE', 'BAR'],
    MUSIC: ['DJ', 'LIVE_MUSIC', 'LIGHTING'],
};

// Reach numbers, shared so a vendor's renders agree with each other.
export const VENDOR_RENDER_REACH = { guests: 148, proViewers: 112, proViews: 1240, postViewers: 96, reactions: 87, comments: 23, listTaps: 36, partnerCardTaps: 19 };
