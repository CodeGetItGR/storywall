import type { EventTypeConvention } from '@/lib/api/types';
import type { LandingImageAsset } from '@/lib/landingMedia';

// A photo cropped to a frame; `position` (CSS object-position) keeps the right part in view.
export type OccasionPhoto = LandingImageAsset & { position?: string };

// The hero phone's feed, drawn from the occasion's own photos. Without one, the hero shows the
// landing's wedding screenshots.
export type OccasionHeroFeed = {
    cover: OccasionPhoto;
    // One per post in the feed copy (OccasionPages.<type>.hero.feed.posts), in order.
    posts: OccasionPhoto[];
    // Faces for the avatars, cropped from the same photos.
    avatars: OccasionPhoto[];
    // The two post cards floating beside the phone.
    cards: [OccasionPhoto, OccasionPhoto];
};

type OccasionMedia = {
    heroFeed: OccasionHeroFeed | null;
    // Before, on the day, after: same order as the timeline copy. Each is a gallery of photos.
    moments: [LandingImageAsset[], LandingImageAsset[], LandingImageAsset[]];
    finalImage: LandingImageAsset;
};

const asset = (name: string, width: number, height: number): LandingImageAsset => ({ src: `/landing/${name}.webp`, width, height });

const INVITATION_PHOTO = asset('guest-viewing-the-storywall-invitation-on-a-phone', 700, 875);
const RSVP_PHOTO = asset('guest-confirming-the-storywall-rsvp', 700, 875);
const WISH_PHOTO = asset('guest-sharing-a-wish-in-the-storywall-guestbook', 700, 875);

const BAPTISM_CHURCH = asset('baptism-ceremony-inside-the-church', 1448, 1086);
const BAPTISM_TABLE = asset('baptism-celebration-at-the-table', 1448, 1086);
const BAPTISM_OUTSIDE = asset('happy-baptism-celebration-outside-the-church-on-a-greek-island', 1536, 1024);

const MEDIA: Partial<Record<EventTypeConvention, OccasionMedia>> = {
    WEDDING: {
        // The landing's hero already shows a wedding.
        heroFeed: null,
        moments: [
            [INVITATION_PHOTO, RSVP_PHOTO, asset('01-bachelor-santorini', 1536, 1024)],
            [
                asset('02-bride-preparation-santorini', 1536, 1024),
                asset('03-wedding-ceremony-santorini', 1536, 1024),
                asset('04-wedding-reception-santorini', 1536, 1024),
            ],
            [WISH_PHOTO, asset('05-honeymoon-paris', 1448, 1086)],
        ],
        finalImage: asset('storywall-final-cta-wedding-santorini', 1448, 1086),
    },
    BAPTISM: {
        heroFeed: {
            cover: { ...BAPTISM_OUTSIDE, position: '50% 35%' },
            posts: [BAPTISM_CHURCH, BAPTISM_TABLE, { ...BAPTISM_OUTSIDE, position: '30% 50%' }],
            avatars: [
                { ...BAPTISM_CHURCH, position: '38% 22%' },
                { ...BAPTISM_TABLE, position: '62% 30%' },
                { ...BAPTISM_OUTSIDE, position: '53% 40%' },
                { ...BAPTISM_CHURCH, position: '72% 35%' },
            ],
            cards: [BAPTISM_TABLE, BAPTISM_CHURCH],
        },
        moments: [
            [INVITATION_PHOTO, RSVP_PHOTO],
            // The hero shows the church outside, so the day opens inside it.
            [BAPTISM_CHURCH, BAPTISM_OUTSIDE, BAPTISM_TABLE],
            [WISH_PHOTO, BAPTISM_TABLE],
        ],
        finalImage: BAPTISM_TABLE,
    },
};

// null → the occasion has no media yet; its page leaves out the photo sections.
export function occasionMedia(eventType: EventTypeConvention): OccasionMedia | null {
    return MEDIA[eventType] ?? null;
}
