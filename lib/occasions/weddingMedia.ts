import type { Locale } from '@/i18n/config';
import type { LandingImageAsset } from '@/lib/landingMedia';
import type { OccasionPhoto } from '@/lib/occasions/occasionMedia';

// Every wedding-only picture on the page. The hero and the demo use the landing's own pictures.
// Swap a picture here and it changes everywhere it appears.
const photo = (name: string, width: number, height: number): OccasionPhoto => ({ src: `/landing/wedding/${name}.webp`, width, height });

// "Without StoryWall": three photos scattered on the card.
export const WEDDING_WITHOUT_PHOTOS = [
    photo('wedding-without-photo-1', 480, 440),
    photo('wedding-without-photo-2', 480, 440),
    photo('wedding-without-photo-3', 480, 440),
] as const;

// The guest scanning the table QR code. Its card and phone show Greek words, on both pages for now.
export const WEDDING_QR_PHOTO = photo('wedding-guest-scans-table-qr', 800, 600);

const marqueeTile = (photoName: string, avatarName: string) => ({
    photo: photo(`wedding-marquee-${photoName}`, 460, 600),
    avatar: photo(`wedding-marquee-avatar-${avatarName}`, 160, 160),
});

// Same order as OccasionPages.WEDDING.why.with.marquee. Nefeli posts two of them.
export const WEDDING_MARQUEE = [
    marqueeTile('01-dress-preparation', 'ioanna'),
    marqueeTile('02-night-out', 'maria'),
    marqueeTile('03-taverna-toast', 'kostas'),
    marqueeTile('04-party-dance', 'sofia'),
    marqueeTile('05-groom-friends', 'petros'),
    marqueeTile('06-bride-preparation', 'eleni'),
    marqueeTile('07-guests-at-church', 'anna'),
    marqueeTile('08-couple-arrives', 'giorgos'),
    marqueeTile('09-tender-moment', 'ioanna-koumpara'),
    marqueeTile('10-first-dance', 'nikos'),
    marqueeTile('11-reception-dance', 'katerina'),
    marqueeTile('12-bride-morning', 'nefeli'),
    marqueeTile('13-paris-trip', 'nefeli'),
    marqueeTile('14-paris-arrival', 'orestis'),
] as const;

// RSVP replies without and with StoryWall: both side by side from 761 px, one under the other below.
// The pictures hold text, so each language has its own set.
const rsvpPictures = (suffix: string) => ({
    both: photo(`wedding-rsvp-replies-without-and-with${suffix}`, 2044, 1380),
    without: photo(`wedding-rsvp-replies-without${suffix}`, 800, 1239),
    with: photo(`wedding-rsvp-replies-with${suffix}`, 900, 990),
});

export const WEDDING_RSVP_PICTURES: Record<Locale, ReturnType<typeof rsvpPictures>> = {
    el: rsvpPictures(''),
    en: rsvpPictures('-en'),
};

export const WEDDING_FINAL_CTA_IMAGE: LandingImageAsset = { src: '/landing/storywall-final-cta-wedding-santorini.webp', width: 1448, height: 1086 };
