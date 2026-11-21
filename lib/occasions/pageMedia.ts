import type { Locale } from '@/i18n/config';
import type { LandingImageAsset } from '@/lib/landingMedia';
import type { OccasionPhoto } from '@/lib/occasions/occasionMedia';

// Every picture an occasion page shows. Swap one here and it changes everywhere it appears.

// A guest's photo with the face on its name pill, or a post card's photo and author.
export type OccasionGuestPhoto = { photo: OccasionPhoto; avatar: OccasionPhoto };

// RSVP replies without and with StoryWall: both side by side from 761 px, one under the other below.
export type OccasionRsvpPictures = { both: OccasionPhoto; without: OccasionPhoto; with: OccasionPhoto };

// The hero phone's screenshot and the two post cards beside it.
export type OccasionHeroMedia = { feed: OccasionPhoto; posts: readonly [OccasionGuestPhoto, OccasionGuestPhoto] };

export type OccasionPageMedia = {
    // null → the landing's own phone feed and post cutouts.
    hero: OccasionHeroMedia | null;
    withoutPhotos: readonly [OccasionPhoto, OccasionPhoto, OccasionPhoto];
    qrPhoto: OccasionPhoto;
    // Same order as OccasionPages.<type>.why.with.marquee.
    guestPhotos: readonly OccasionGuestPhoto[];
    // The pictures hold text, so each language has its own set.
    rsvpPictures: Record<Locale, OccasionRsvpPictures>;
    // The phone beside the Themes section; null on a page without one.
    themesPhone: OccasionPhoto | null;
    finalCtaImage: LandingImageAsset;
};

const wedding = (name: string, width: number, height: number): OccasionPhoto => ({ src: `/landing/wedding/${name}.webp`, width, height });
const landing = (name: string, width: number, height: number): OccasionPhoto => ({ src: `/landing/${name}.webp`, width, height });
const guestAvatar = (name: string) => wedding(`wedding-marquee-avatar-${name}`, 160, 160);

const marqueeTile = (photoName: string, avatarName: string): OccasionGuestPhoto => ({
    photo: wedding(`wedding-marquee-${photoName}`, 460, 600),
    avatar: guestAvatar(avatarName),
});

const rsvpPictures = (suffix: string): OccasionRsvpPictures => ({
    both: wedding(`wedding-rsvp-replies-without-and-with${suffix}`, 2044, 1380),
    without: wedding(`wedding-rsvp-replies-without${suffix}`, 800, 1239),
    with: wedding(`wedding-rsvp-replies-with${suffix}`, 900, 990),
});

const WEDDING_RSVP_PICTURES: Record<Locale, OccasionRsvpPictures> = { el: rsvpPictures(''), en: rsvpPictures('-en') };

export const WEDDING_PAGE_MEDIA: OccasionPageMedia = {
    hero: null,
    withoutPhotos: [
        wedding('wedding-without-photo-1', 480, 440),
        wedding('wedding-without-photo-2', 480, 440),
        wedding('wedding-without-photo-3', 480, 440),
    ],
    // The guest scanning the table QR code. Its card and phone show Greek words, on both pages for now.
    qrPhoto: wedding('wedding-guest-scans-table-qr', 800, 600),
    // Nefeli posts two of them.
    guestPhotos: [
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
    ],
    rsvpPictures: WEDDING_RSVP_PICTURES,
    themesPhone: null,
    finalCtaImage: { src: '/landing/storywall-final-cta-wedding-santorini.webp', width: 1448, height: 1086 },
};

const BAPTISM_CHURCH = landing('baptism-ceremony-inside-the-church', 1448, 1086);
const BAPTISM_TABLE = landing('baptism-celebration-at-the-table', 1448, 1086);
const BAPTISM_OUTSIDE = landing('happy-baptism-celebration-outside-the-church-on-a-greek-island', 1536, 1024);
// The draft's feed screenshot: a baptism on the Unicorn theme.
const BAPTISM_FEED = { src: '/landing/baptism/baptism-feed-unicorn.webp', width: 978, height: 1764 };

export const BAPTISM_PAGE_MEDIA: OccasionPageMedia = {
    hero: {
        feed: BAPTISM_FEED,
        // The post authors' faces are cropped from the baptism photos.
        posts: [
            { photo: BAPTISM_CHURCH, avatar: { ...BAPTISM_OUTSIDE, position: '53% 40%' } },
            { photo: BAPTISM_TABLE, avatar: { ...BAPTISM_TABLE, position: '62% 30%' } },
        ],
    },
    withoutPhotos: [BAPTISM_CHURCH, BAPTISM_TABLE, BAPTISM_OUTSIDE],
    qrPhoto: landing('guest-scanning-the-storywall-qr-code', 700, 875),
    guestPhotos: [
        { photo: BAPTISM_OUTSIDE, avatar: guestAvatar('anna') },
        { photo: BAPTISM_CHURCH, avatar: guestAvatar('giorgos') },
        { photo: BAPTISM_TABLE, avatar: guestAvatar('eleni') },
    ],
    // The wedding's for now; KAN-253 draws the baptism's own.
    rsvpPictures: WEDDING_RSVP_PICTURES,
    themesPhone: BAPTISM_FEED,
    finalCtaImage: BAPTISM_OUTSIDE,
};
