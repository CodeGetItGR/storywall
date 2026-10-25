import type { LandingImageAsset } from '@/lib/landingMedia';
import type { OccasionPhoto } from '@/lib/occasions/occasionMedia';

// Every photo on the wedding page. Swap a photo here and it changes everywhere it appears.
const photo = (name: string, width: number, height: number): OccasionPhoto => ({ src: `/landing/wedding/${name}.webp`, width, height });
const scene = (name: string) => photo(name, 960, 720);
const square = (name: string) => photo(name, 720, 720);
const thumb = (name: string) => photo(name, 320, 320);

// Faces, each shared by several names on the page.
const F1 = thumb('wedding-guest-woman-sage-dress');
const F2 = thumb('wedding-guest-woman-dark-hair');
const F3 = thumb('wedding-guest-woman-auburn-bob');
const F4 = thumb('wedding-guest-woman-blonde-braid');
const F5 = thumb('wedding-guest-woman-pearl-necklace');
const F6 = thumb('wedding-guest-woman-curly-hair');
const F7 = thumb('wedding-guest-woman-sun-hat');
const M1 = thumb('wedding-guest-man-beard');
const M2 = thumb('wedding-guest-man-curly-hair');
const M3 = thumb('wedding-guest-man-glasses');
const M4 = thumb('wedding-guest-man-linen-suit');
const M5 = thumb('wedding-guest-man-moustache');

// One post in a phone feed: its author, one or two photos, and the faces of its two replies.
export type WeddingFeedPostMedia = {
    author: OccasionPhoto;
    photos: readonly [OccasionPhoto] | readonly [OccasionPhoto, OccasionPhoto];
    replies: readonly [OccasionPhoto, OccasionPhoto];
};

export type WeddingHeroMedia = {
    cover: OccasionPhoto;
    // The person holding the phone: "your story" and the composer.
    viewer: OccasionPhoto;
    // Guests, moments, venue.
    stories: readonly [OccasionPhoto, OccasionPhoto, OccasionPhoto];
    // Same order as OccasionPages.WEDDING.hero.feed.posts.
    posts: readonly WeddingFeedPostMedia[];
    // The two post cards beside the phone.
    cards: readonly [{ author: OccasionPhoto; photo: OccasionPhoto }, { author: OccasionPhoto; photo: OccasionPhoto }];
    // The two comment cards beside the phone: one or two faces each.
    comments: readonly [readonly OccasionPhoto[], readonly OccasionPhoto[]];
};

const STORIES = [thumb('wedding-story-couple-selfie'), thumb('wedding-story-bride-updo'), thumb('wedding-story-groom-portrait')] as const;

export const WEDDING_HERO_MEDIA: WeddingHeroMedia = {
    cover: photo('wedding-feed-cover-couple', 960, 660),
    viewer: F7,
    stories: STORIES,
    posts: [
        { author: F1, photos: [scene('wedding-post-bride-and-bridesmaids')], replies: [F2, M1] },
        { author: F3, photos: [square('wedding-post-mother-buttons-dress'), square('wedding-post-bride-and-mother')], replies: [F5, F4] },
        { author: M1, photos: [scene('wedding-post-groomsmen-bow-tie')], replies: [M2, M3] },
        { author: F2, photos: [scene('wedding-post-guests-walk-to-chapel')], replies: [F6, M4] },
        { author: F5, photos: [scene('wedding-post-ring-exchange')], replies: [F3, M1] },
        { author: M2, photos: [square('wedding-post-couple-under-petals'), square('wedding-post-couple-walks-through-guests')], replies: [F2, M3] },
        { author: F6, photos: [scene('wedding-post-sunset-dinner')], replies: [F5, F4] },
        { author: M3, photos: [square('wedding-post-first-dance-close'), square('wedding-post-first-dance-wide')], replies: [F2, M4] },
        { author: F4, photos: [scene('wedding-post-bride-dancing')], replies: [F6, M5] },
    ],
    cards: [
        { author: F2, photo: scene('wedding-card-couple-dancing') },
        { author: F4, photo: scene('wedding-card-bride-dancing') },
    ],
    comments: [[F7, M4], [F1]],
};

const DEMO_CONFETTI = square('wedding-demo-couple-confetti');

// The demo section's two phones.
export const WEDDING_DEMO_MEDIA = {
    cover: photo('wedding-demo-cover-couple-park', 960, 660),
    viewer: F7,
    stories: STORIES,
    post: { author: F1, photos: [DEMO_CONFETTI, square('wedding-demo-dinner-toast')] as const },
    // The profile menu's avatar: the couple, cropped to their faces.
    profile: { ...DEMO_CONFETTI, position: '50% 28%' },
} as const;

// "Without StoryWall": three photos scattered on the card.
export const WEDDING_WITHOUT_PHOTOS = [
    photo('wedding-without-photo-1', 480, 440),
    photo('wedding-without-photo-2', 480, 440),
    photo('wedding-without-photo-3', 480, 440),
] as const;

// The guest scanning the table QR code.
export const WEDDING_QR_PHOTO = scene('wedding-guest-scans-table-qr');

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

// Same order as OccasionPages.WEDDING.rsvp.without.replies.
export const WEDDING_RSVP_AVATARS = [F6, M2, F3, F5, M3] as const;

export const WEDDING_FINAL_CTA_IMAGE: LandingImageAsset = { src: '/landing/storywall-final-cta-wedding-santorini.webp', width: 1448, height: 1086 };
