import type {
    AppConfigResponseDto,
    AuthorDto,
    CommentResponseDto,
    EventBillingResponseDto,
    EventDetailResponseDto,
    EventGiftAccountResponseDto,
    EventMemberResponseDto,
    EventModuleResponseDto,
    EventSessionResponseDto,
    EventUsageResponseDto,
    MediaResponseDto,
    PlaylistSuggestionResponseDto,
    PostResponseDto,
    PostType,
    QrLinkResponseDto,
    QrLinkStatsDto,
    ReactionResponseDto,
    RsvpResponseDto,
    StoryResponseDto,
    WishbookEntryResponseDto,
} from '@/lib/api/types';
import { EVENT_MODULE_KEYS } from '@/lib/api/types';
import { DEMO_EVENT_ID, DEMO_HOST_MEMBER_ID, DEMO_USER_ID } from '@/lib/demo/demoConstants';

const NOW = () => new Date().toISOString();
const DAYS = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();
const MINUTES_AFTER = (n: number, minutes: number) => new Date(Date.now() + n * 86_400_000 + minutes * 60_000).toISOString();

// Every seed "photo" and the cover banner are hand-drawn gradient SVGs encoded as data
// URLs — the demo never needs to ship real binary sample assets, and every image stays
// visually distinct (label + palette) instead of one reused 1x1 placeholder pixel.
function svgDataUrl(svg: string): string {
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// SVG is XML — text content must escape entities or the whole document fails to parse
// (e.g. a bare "&" in "Alex & Riley" breaks the image outright, not just the glyph).
function escapeXml(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function bannerImage(title: string, subtitle: string, from: string, to: string): string {
    const safeTitle = escapeXml(title);
    const safeSubtitle = escapeXml(subtitle);
    return svgDataUrl(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630">` +
            `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
            `<stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>` +
            `<rect width="1200" height="630" fill="url(#g)"/>` +
            `<circle cx="220" cy="150" r="150" fill="#ffffff" opacity="0.08"/>` +
            `<circle cx="1030" cy="520" r="200" fill="#ffffff" opacity="0.08"/>` +
            `<text x="600" y="320" font-family="Georgia, 'Times New Roman', serif" font-size="76" fill="#ffffff" text-anchor="middle" opacity="0.97">${safeTitle}</text>` +
            `<text x="600" y="378" font-family="Georgia, 'Times New Roman', serif" font-size="26" letter-spacing="6" fill="#ffffff" text-anchor="middle" opacity="0.85">${safeSubtitle}</text>` +
            `</svg>`,
    );
}

function photoImage(label: string, from: string, to: string, width = 900, height = 1125): string {
    const r = Math.min(width, height) * 0.16;
    const safeLabel = escapeXml(label);
    return svgDataUrl(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">` +
            `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
            `<stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>` +
            `<rect width="${width}" height="${height}" fill="url(#g)"/>` +
            `<circle cx="${width * 0.5}" cy="${height * 0.38}" r="${r}" fill="#ffffff" opacity="0.16"/>` +
            `<text x="${width / 2}" y="${height - 56}" font-family="Georgia, 'Times New Roman', serif" font-size="${width * 0.045}" fill="#ffffff" text-anchor="middle" opacity="0.92">${safeLabel}</text>` +
            `</svg>`,
    );
}

const PALETTE: [string, string][] = [
    ['#f7b2b7', '#f28cb1'],
    ['#f6c1a7', '#f2977a'],
    ['#e8b7d4', '#c98bd0'],
    ['#f9d9a0', '#f0b26b'],
    ['#d9c2f0', '#b48ee0'],
    ['#a7d8d0', '#6fb8ae'],
    ['#f4a6a1', '#e2726c'],
    ['#c9d8f0', '#8fa8e0'],
];

function paletteFor(index: number): [string, string] {
    return PALETTE[index % PALETTE.length];
}

export const DEMO_SESSION_ID = 'demo-session-main';
export const DEMO_SESSION_SECONDARY_ID = 'demo-session-secondary';

// --- Members ---

export const DEMO_COHOST_MEMBER_ID = 'demo-member-cohost';
const G1 = 'demo-member-guest-1';
const G2 = 'demo-member-guest-2';
const G3 = 'demo-member-guest-3';
const G4 = 'demo-member-guest-4';
const G5 = 'demo-member-guest-5';
const G6 = 'demo-member-guest-6';
const G7 = 'demo-member-guest-7';
const G8 = 'demo-member-guest-8';

export function buildSeedMembers(): EventMemberResponseDto[] {
    return [
        {
            id: DEMO_HOST_MEMBER_ID,
            eventId: DEMO_EVENT_ID,
            userId: DEMO_USER_ID,
            invitationId: null,
            role: 'HOST',
            displayName: 'Alex Rivera',
            nickname: null,
            relationshipRole: null,
            customRelationshipRole: null,
            isFeatured: true,
            avatarUrl: null,
            joinedAt: DAYS(-60),
            rsvpId: null,
            createdAt: DAYS(-60),
            updatedAt: DAYS(-60),
            deletedAt: null,
        },
        {
            id: DEMO_COHOST_MEMBER_ID,
            eventId: DEMO_EVENT_ID,
            userId: null,
            invitationId: null,
            role: 'HOST',
            displayName: 'Riley Chen',
            nickname: null,
            relationshipRole: null,
            customRelationshipRole: null,
            isFeatured: true,
            avatarUrl: null,
            joinedAt: DAYS(-60),
            rsvpId: null,
            createdAt: DAYS(-60),
            updatedAt: DAYS(-60),
            deletedAt: null,
        },
        {
            id: G1,
            eventId: DEMO_EVENT_ID,
            userId: null,
            invitationId: null,
            role: 'ATTENDEE',
            displayName: 'Jordan Lee',
            nickname: null,
            relationshipRole: 'Friend',
            customRelationshipRole: null,
            isFeatured: false,
            avatarUrl: null,
            joinedAt: DAYS(-40),
            rsvpId: 'demo-rsvp-1',
            createdAt: DAYS(-40),
            updatedAt: DAYS(-40),
            deletedAt: null,
        },
        {
            id: G2,
            eventId: DEMO_EVENT_ID,
            userId: null,
            invitationId: null,
            role: 'ATTENDEE',
            displayName: 'Sam Okafor',
            nickname: null,
            relationshipRole: 'Cousin',
            customRelationshipRole: null,
            isFeatured: false,
            avatarUrl: null,
            joinedAt: DAYS(-38),
            rsvpId: 'demo-rsvp-2',
            createdAt: DAYS(-38),
            updatedAt: DAYS(-38),
            deletedAt: null,
        },
        {
            id: G3,
            eventId: DEMO_EVENT_ID,
            userId: null,
            invitationId: null,
            role: 'ATTENDEE',
            displayName: 'Priya Patel',
            nickname: null,
            relationshipRole: 'Maid of Honor',
            customRelationshipRole: null,
            isFeatured: true,
            avatarUrl: null,
            joinedAt: DAYS(-55),
            rsvpId: 'demo-rsvp-3',
            createdAt: DAYS(-55),
            updatedAt: DAYS(-55),
            deletedAt: null,
        },
        {
            id: G4,
            eventId: DEMO_EVENT_ID,
            userId: null,
            invitationId: null,
            role: 'ATTENDEE',
            displayName: 'Marcus Webb',
            nickname: null,
            relationshipRole: 'Best Man',
            customRelationshipRole: null,
            isFeatured: true,
            avatarUrl: null,
            joinedAt: DAYS(-55),
            rsvpId: 'demo-rsvp-4',
            createdAt: DAYS(-55),
            updatedAt: DAYS(-55),
            deletedAt: null,
        },
        {
            id: G5,
            eventId: DEMO_EVENT_ID,
            userId: null,
            invitationId: null,
            role: 'ATTENDEE',
            displayName: 'Nina Kowalski',
            nickname: null,
            relationshipRole: 'College Friend',
            customRelationshipRole: null,
            isFeatured: false,
            avatarUrl: null,
            joinedAt: DAYS(-30),
            rsvpId: 'demo-rsvp-5',
            createdAt: DAYS(-30),
            updatedAt: DAYS(-30),
            deletedAt: null,
        },
        {
            id: G6,
            eventId: DEMO_EVENT_ID,
            userId: null,
            invitationId: null,
            role: 'ATTENDEE',
            displayName: 'Diego Fernandez',
            nickname: null,
            relationshipRole: 'Uncle',
            customRelationshipRole: null,
            isFeatured: false,
            avatarUrl: null,
            joinedAt: DAYS(-25),
            rsvpId: 'demo-rsvp-6',
            createdAt: DAYS(-25),
            updatedAt: DAYS(-25),
            deletedAt: null,
        },
        {
            id: G7,
            eventId: DEMO_EVENT_ID,
            userId: null,
            invitationId: null,
            role: 'ATTENDEE',
            displayName: 'Emily Chen',
            nickname: null,
            relationshipRole: 'Coworker',
            customRelationshipRole: null,
            isFeatured: false,
            avatarUrl: null,
            joinedAt: DAYS(-14),
            rsvpId: null,
            createdAt: DAYS(-14),
            updatedAt: DAYS(-14),
            deletedAt: null,
        },
        {
            id: G8,
            eventId: DEMO_EVENT_ID,
            userId: null,
            invitationId: null,
            role: 'ATTENDEE',
            displayName: 'Tomasz Novak',
            nickname: null,
            relationshipRole: 'Neighbor',
            customRelationshipRole: null,
            isFeatured: false,
            avatarUrl: null,
            joinedAt: DAYS(-10),
            rsvpId: null,
            createdAt: DAYS(-10),
            updatedAt: DAYS(-10),
            deletedAt: null,
        },
    ];
}

// --- Media ---

export const DEMO_BANNER_MEDIA_ID = 'demo-media-banner';

export function buildSeedMedia(): MediaResponseDto[] {
    const entries: { id: string; label: string; filename: string; uploaderId: string; daysAgo: number; kind: 'portrait' | 'landscape' }[] = [
        {
            id: 'demo-media-first-look',
            label: 'First Look',
            filename: 'first-look.png',
            uploaderId: DEMO_HOST_MEMBER_ID,
            daysAgo: -14,
            kind: 'portrait',
        },
        {
            id: 'demo-media-ceremony',
            label: 'Ceremony Kiss',
            filename: 'ceremony-kiss.png',
            uploaderId: DEMO_COHOST_MEMBER_ID,
            daysAgo: -13,
            kind: 'landscape',
        },
        { id: 'demo-media-rings', label: 'Ring Exchange', filename: 'ring-exchange.png', uploaderId: G3, daysAgo: -13, kind: 'portrait' },
        {
            id: 'demo-media-first-dance',
            label: 'First Dance',
            filename: 'first-dance.png',
            uploaderId: DEMO_HOST_MEMBER_ID,
            daysAgo: -12,
            kind: 'portrait',
        },
        { id: 'demo-media-toast', label: 'Best Man Toast', filename: 'toast.png', uploaderId: G4, daysAgo: -12, kind: 'landscape' },
        { id: 'demo-media-cake', label: 'Cake Cutting', filename: 'cake-cutting.png', uploaderId: G1, daysAgo: -11, kind: 'portrait' },
        { id: 'demo-media-bouquet', label: 'Bouquet Toss', filename: 'bouquet-toss.png', uploaderId: G5, daysAgo: -11, kind: 'portrait' },
        {
            id: 'demo-media-dancefloor',
            label: 'Dance Floor',
            filename: 'dance-floor.png',
            uploaderId: G2,
            daysAgo: -10,
            kind: 'landscape',
        },
        {
            id: 'demo-media-confetti',
            label: 'Grand Exit',
            filename: 'confetti-exit.png',
            uploaderId: DEMO_HOST_MEMBER_ID,
            daysAgo: -10,
            kind: 'portrait',
        },
        { id: 'demo-media-family', label: 'Family Portrait', filename: 'family-portrait.png', uploaderId: G6, daysAgo: -13, kind: 'landscape' },
        {
            id: 'demo-media-getting-ready-bride',
            label: 'Getting Ready',
            filename: 'getting-ready-bride.png',
            uploaderId: DEMO_HOST_MEMBER_ID,
            daysAgo: -1,
            kind: 'portrait',
        },
        {
            id: 'demo-media-getting-ready-groom',
            label: 'Getting Ready',
            filename: 'getting-ready-groom.png',
            uploaderId: DEMO_COHOST_MEMBER_ID,
            daysAgo: -1,
            kind: 'portrait',
        },
        {
            id: 'demo-media-venue',
            label: 'Willowbrook Gardens',
            filename: 'venue-sunset.png',
            uploaderId: DEMO_HOST_MEMBER_ID,
            daysAgo: -20,
            kind: 'landscape',
        },
        { id: 'demo-media-rehearsal', label: 'Rehearsal Dinner', filename: 'rehearsal-dinner.png', uploaderId: G4, daysAgo: -14, kind: 'landscape' },
    ];

    const media: MediaResponseDto[] = entries.map((entry, index) => {
        const [from, to] = paletteFor(index);
        const isPortrait = entry.kind === 'portrait';
        const width = isPortrait ? 900 : 1200;
        const height = isPortrait ? 1125 : 800;
        const image = photoImage(entry.label, from, to, width, height);
        return {
            id: entry.id,
            eventId: DEMO_EVENT_ID,
            uploaderMemberId: entry.uploaderId,
            anonymousUploaderName: null,
            storageKey: `demo/${entry.filename}`,
            mediaUrl: image,
            status: 'READY',
            thumbnailUrl: image,
            originalFilename: entry.filename,
            mimeType: 'image/svg+xml',
            mediaType: 'IMAGE',
            fileSize: 24_576,
            width,
            height,
            durationSeconds: null,
            metadata: {},
            createdAt: DAYS(entry.daysAgo),
            deletedAt: null,
        };
    });

    const banner: MediaResponseDto = {
        id: DEMO_BANNER_MEDIA_ID,
        eventId: DEMO_EVENT_ID,
        uploaderMemberId: DEMO_HOST_MEMBER_ID,
        anonymousUploaderName: null,
        storageKey: 'demo/banner.svg',
        mediaUrl: bannerImage('Alex & Riley', 'ARE GETTING MARRIED', '#f2885c', '#c777b1'),
        status: 'READY',
        thumbnailUrl: bannerImage('Alex & Riley', 'ARE GETTING MARRIED', '#f2885c', '#c777b1'),
        originalFilename: 'banner.svg',
        mimeType: 'image/svg+xml',
        mediaType: 'IMAGE',
        fileSize: 32_768,
        width: 1200,
        height: 630,
        durationSeconds: null,
        metadata: {},
        createdAt: DAYS(-30),
        deletedAt: null,
    };

    return [banner, ...media];
}

function mediaById(id: string): MediaResponseDto {
    const found = buildSeedMedia().find((m) => m.id === id);
    if (!found) throw new Error(`Unknown demo media id: ${id}`);
    return found;
}

// --- Posts, comments & reactions (defined together so counts always agree) ---

type PostCommentSeed = { id: string; authorId: string; content: string; minutesAfter: number; parentIndex?: number };
type PostReactionSeed = { authorId: string; type: 'LOVE' | 'LIKE' | 'HAHA' | 'WOW' };
type PostSeed = {
    id: string;
    authorId: string | null;
    type: PostType;
    content: string | null;
    mediaIds: string[];
    isPinned: boolean;
    daysAgo: number;
    comments: PostCommentSeed[];
    reactions: PostReactionSeed[];
};

function authorFor(memberId: string | null, members: EventMemberResponseDto[]): AuthorDto | null {
    const member = memberId ? members.find((m) => m.id === memberId) : undefined;
    if (!member) return null;
    return { memberId: member.id, displayName: member.displayName, nickname: member.nickname, role: member.role, avatarUrl: member.avatarUrl };
}

function buildPostSeeds(): PostSeed[] {
    return [
        {
            id: 'demo-post-announcement',
            authorId: DEMO_HOST_MEMBER_ID,
            type: 'ANNOUNCEMENT',
            content: "We're married! 🎉 Thank you all for being part of the most beautiful day of our lives. More photos coming soon!",
            mediaIds: [],
            isPinned: true,
            daysAgo: -9,
            comments: [
                { id: 'demo-comment-1', authorId: G3, content: 'Best day ever!! Love you both so much 💕', minutesAfter: 12 },
                { id: 'demo-comment-2', authorId: G4, content: 'Congrats you two, what a party!', minutesAfter: 40 },
                { id: 'demo-comment-3', authorId: G1, content: "Still can't stop smiling thinking about it", minutesAfter: 90 },
            ],
            reactions: [
                { authorId: G1, type: 'LOVE' },
                { authorId: G2, type: 'LOVE' },
                { authorId: G3, type: 'LOVE' },
                { authorId: G4, type: 'LOVE' },
                { authorId: G5, type: 'LIKE' },
                { authorId: G6, type: 'LOVE' },
                { authorId: DEMO_COHOST_MEMBER_ID, type: 'LOVE' },
            ],
        },
        {
            id: 'demo-post-first-dance',
            authorId: DEMO_HOST_MEMBER_ID,
            type: 'MEDIA',
            content: "Couldn't stop smiling during the first dance 💃",
            mediaIds: ['demo-media-first-dance'],
            isPinned: true,
            daysAgo: -12,
            comments: [
                { id: 'demo-comment-4', authorId: G1, content: 'This photo is everything 😍', minutesAfter: 20 },
                { id: 'demo-comment-5', authorId: G5, content: 'You two look so happy!', minutesAfter: 55 },
            ],
            reactions: [
                { authorId: DEMO_COHOST_MEMBER_ID, type: 'LOVE' },
                { authorId: G1, type: 'LOVE' },
                { authorId: G2, type: 'WOW' },
                { authorId: G3, type: 'LOVE' },
                { authorId: G5, type: 'LOVE' },
            ],
        },
        {
            id: 'demo-post-2',
            authorId: G1,
            type: 'TEXT',
            content: 'So happy to be here celebrating you two! 🎉',
            mediaIds: [],
            isPinned: false,
            daysAgo: -13,
            comments: [{ id: 'demo-comment-6', authorId: DEMO_HOST_MEMBER_ID, content: 'So glad you made it, Jordan! 🥂', minutesAfter: 30 }],
            reactions: [{ authorId: DEMO_HOST_MEMBER_ID, type: 'LIKE' }],
        },
        {
            id: 'demo-post-ceremony',
            authorId: DEMO_COHOST_MEMBER_ID,
            type: 'MEDIA',
            content: 'The moment it became official 💍',
            mediaIds: ['demo-media-ceremony', 'demo-media-rings'],
            isPinned: false,
            daysAgo: -13,
            comments: [
                { id: 'demo-comment-7', authorId: G4, content: 'Chills. Absolute chills.', minutesAfter: 8 },
                { id: 'demo-comment-8', authorId: G6, content: 'Beautiful ceremony from start to finish', minutesAfter: 45 },
                { id: 'demo-comment-9', authorId: G3, content: 'I cried the whole time, no regrets', minutesAfter: 70 },
                { id: 'demo-comment-10', authorId: G7, content: 'So elegant! Congratulations 🤍', minutesAfter: 120 },
            ],
            reactions: [
                { authorId: DEMO_HOST_MEMBER_ID, type: 'LOVE' },
                { authorId: G1, type: 'LOVE' },
                { authorId: G2, type: 'LOVE' },
                { authorId: G3, type: 'LOVE' },
                { authorId: G4, type: 'LOVE' },
                { authorId: G6, type: 'LOVE' },
                { authorId: G7, type: 'LOVE' },
                { authorId: G8, type: 'LIKE' },
            ],
        },
        {
            id: 'demo-post-toast',
            authorId: G4,
            type: 'MEDIA',
            content: "Gave the best man speech of my life tonight. Love you both, here's to forever 🥂",
            mediaIds: ['demo-media-toast'],
            isPinned: false,
            daysAgo: -12,
            comments: [
                { id: 'demo-comment-11', authorId: DEMO_HOST_MEMBER_ID, content: 'Had us all in tears, thank you Marcus', minutesAfter: 15 },
                { id: 'demo-comment-12', authorId: G5, content: 'That toast was incredible 👏', minutesAfter: 35 },
            ],
            reactions: [
                { authorId: DEMO_HOST_MEMBER_ID, type: 'LOVE' },
                { authorId: DEMO_COHOST_MEMBER_ID, type: 'LOVE' },
                { authorId: G3, type: 'HAHA' },
                { authorId: G5, type: 'LOVE' },
            ],
        },
        {
            id: 'demo-post-cake',
            authorId: G1,
            type: 'MEDIA',
            content: 'Cake cutting chaos 🎂😂',
            mediaIds: ['demo-media-cake'],
            isPinned: false,
            daysAgo: -11,
            comments: [{ id: 'demo-comment-13', authorId: G2, content: 'That frosting fight was iconic', minutesAfter: 22 }],
            reactions: [
                { authorId: DEMO_HOST_MEMBER_ID, type: 'HAHA' },
                { authorId: G2, type: 'HAHA' },
                { authorId: G4, type: 'LIKE' },
            ],
        },
        {
            id: 'demo-post-bouquet',
            authorId: G5,
            type: 'MEDIA',
            content: "Caught the bouquet! Guess I'm next 👀💐",
            mediaIds: ['demo-media-bouquet'],
            isPinned: false,
            daysAgo: -11,
            comments: [
                { id: 'demo-comment-14', authorId: G3, content: 'It flew straight to you, no contest', minutesAfter: 5 },
                { id: 'demo-comment-15', authorId: G1, content: 'Manifesting it 🙌', minutesAfter: 18 },
            ],
            reactions: [
                { authorId: G1, type: 'HAHA' },
                { authorId: G3, type: 'LOVE' },
                { authorId: DEMO_HOST_MEMBER_ID, type: 'LIKE' },
            ],
        },
        {
            id: 'demo-post-dancefloor',
            authorId: G2,
            type: 'MEDIA',
            content: 'Dance floor was UNMATCHED tonight 🕺💃',
            mediaIds: ['demo-media-dancefloor'],
            isPinned: false,
            daysAgo: -10,
            comments: [],
            reactions: [
                { authorId: G1, type: 'LOVE' },
                { authorId: G4, type: 'LOVE' },
                { authorId: G7, type: 'LIKE' },
            ],
        },
        {
            id: 'demo-post-family',
            authorId: G6,
            type: 'MEDIA',
            content: 'So proud of my niece today. Welcome to the family, Riley! ❤️',
            mediaIds: ['demo-media-family'],
            isPinned: false,
            daysAgo: -13,
            comments: [{ id: 'demo-comment-16', authorId: DEMO_COHOST_MEMBER_ID, content: 'Thank you Diego, love you! 🤍', minutesAfter: 60 }],
            reactions: [
                { authorId: DEMO_HOST_MEMBER_ID, type: 'LOVE' },
                { authorId: DEMO_COHOST_MEMBER_ID, type: 'LOVE' },
            ],
        },
        {
            id: 'demo-post-exit',
            authorId: DEMO_HOST_MEMBER_ID,
            type: 'MEDIA',
            content: 'Grand exit under the confetti ✨ What a night.',
            mediaIds: ['demo-media-confetti'],
            isPinned: false,
            daysAgo: -10,
            comments: [
                { id: 'demo-comment-17', authorId: G8, content: 'Perfect ending to a perfect day', minutesAfter: 25 },
                { id: 'demo-comment-18', authorId: G7, content: 'This picture needs to be framed', minutesAfter: 50 },
            ],
            reactions: [
                { authorId: DEMO_COHOST_MEMBER_ID, type: 'LOVE' },
                { authorId: G3, type: 'WOW' },
                { authorId: G4, type: 'LOVE' },
                { authorId: G8, type: 'LOVE' },
            ],
        },
        {
            id: 'demo-post-rehearsal',
            authorId: G4,
            type: 'MEDIA',
            content: 'Rehearsal dinner the night before — the calm before the (beautiful) storm 🌙',
            mediaIds: ['demo-media-rehearsal'],
            isPinned: false,
            daysAgo: -14,
            comments: [],
            reactions: [{ authorId: DEMO_HOST_MEMBER_ID, type: 'LIKE' }],
        },
        {
            id: 'demo-post-getting-ready',
            authorId: DEMO_HOST_MEMBER_ID,
            type: 'MEDIA',
            content: 'One year later and still thinking about how it all began — getting ready together 🤍',
            mediaIds: ['demo-media-getting-ready-bride', 'demo-media-getting-ready-groom'],
            isPinned: false,
            daysAgo: -1,
            comments: [{ id: 'demo-comment-19', authorId: G5, content: 'This throwback is everything', minutesAfter: 10 }],
            reactions: [
                { authorId: DEMO_COHOST_MEMBER_ID, type: 'LOVE' },
                { authorId: G5, type: 'LOVE' },
            ],
        },
        {
            id: 'demo-post-thankyou',
            authorId: DEMO_COHOST_MEMBER_ID,
            type: 'TEXT',
            content: 'Still processing how lucky we are to have all of you in our lives. Thank you for making our wedding weekend unforgettable 🥹',
            mediaIds: [],
            isPinned: false,
            daysAgo: -8,
            comments: [
                { id: 'demo-comment-20', authorId: G2, content: 'Thank you for having us, it was magical', minutesAfter: 15 },
                { id: 'demo-comment-21', authorId: G6, content: 'We love you both dearly', minutesAfter: 40 },
                { id: 'demo-comment-22', authorId: G1, content: '🥹🥹🥹', minutesAfter: 70 },
            ],
            reactions: [
                { authorId: G1, type: 'LOVE' },
                { authorId: G2, type: 'LOVE' },
                { authorId: G3, type: 'LOVE' },
                { authorId: G6, type: 'LOVE' },
                { authorId: G7, type: 'LOVE' },
            ],
        },
        {
            id: 'demo-post-venue',
            authorId: DEMO_HOST_MEMBER_ID,
            type: 'MEDIA',
            content: 'Falling in love with this venue all over again while planning the day 😍',
            mediaIds: ['demo-media-venue'],
            isPinned: false,
            daysAgo: -20,
            comments: [{ id: 'demo-comment-23', authorId: DEMO_COHOST_MEMBER_ID, content: 'Best decision we made', minutesAfter: 5 }],
            reactions: [{ authorId: DEMO_COHOST_MEMBER_ID, type: 'LOVE' }],
        },
    ];
}

export function buildSeedPosts(): PostResponseDto[] {
    const members = buildSeedMembers();
    return buildPostSeeds().map((seed) => {
        const comments = seed.comments.map((c) => ({
            id: c.id,
            postId: seed.id,
            authorMemberId: c.authorId,
            author: authorFor(c.authorId, members),
            parentCommentId: c.parentIndex !== undefined ? seed.comments[c.parentIndex].id : null,
            content: c.content,
            createdAt: MINUTES_AFTER(seed.daysAgo, c.minutesAfter),
            updatedAt: MINUTES_AFTER(seed.daysAgo, c.minutesAfter),
            deletedAt: null,
        }));

        const reactionCounts: Record<string, number> = {};
        for (const r of seed.reactions) {
            reactionCounts[r.type] = (reactionCounts[r.type] ?? 0) + 1;
        }
        const myReaction = seed.reactions.find((r) => r.authorId === DEMO_HOST_MEMBER_ID);

        return {
            id: seed.id,
            eventId: DEMO_EVENT_ID,
            authorMemberId: seed.authorId,
            author: authorFor(seed.authorId, members),
            type: seed.type,
            content: seed.content,
            isPinned: seed.isPinned,
            media: seed.mediaIds.map((id) => mediaById(id)),
            commentCount: comments.length,
            recentComments: comments.slice(-2),
            reactionCount: seed.reactions.length,
            reactionCounts,
            myReactionType: myReaction?.type ?? null,
            createdAt: DAYS(seed.daysAgo),
            updatedAt: DAYS(seed.daysAgo),
            deletedAt: null,
        };
    });
}

export function buildSeedComments(): CommentResponseDto[] {
    const members = buildSeedMembers();
    return buildPostSeeds().flatMap((seed) =>
        seed.comments.map((c) => ({
            id: c.id,
            postId: seed.id,
            authorMemberId: c.authorId,
            author: authorFor(c.authorId, members),
            parentCommentId: c.parentIndex !== undefined ? seed.comments[c.parentIndex].id : null,
            content: c.content,
            createdAt: MINUTES_AFTER(seed.daysAgo, c.minutesAfter),
            updatedAt: MINUTES_AFTER(seed.daysAgo, c.minutesAfter),
            deletedAt: null,
        })),
    );
}

export function buildSeedReactions(): ReactionResponseDto[] {
    return buildPostSeeds().flatMap((seed, seedIndex) =>
        seed.reactions.map((r, reactionIndex) => ({
            id: `demo-reaction-${seedIndex}-${reactionIndex}`,
            postId: seed.id,
            memberId: r.authorId,
            reactionType: r.type,
            createdAt: MINUTES_AFTER(seed.daysAgo, reactionIndex * 3),
        })),
    );
}

// --- Wishbook ---

export function buildSeedWishbookEntries(): WishbookEntryResponseDto[] {
    const entries: { id: string; authorId: string | null; guestName: string; message: string; daysAgo: number }[] = [
        { id: 'demo-wishbook-1', authorId: G1, guestName: 'Jordan Lee', message: 'Wishing you a lifetime of love and laughter!', daysAgo: -13 },
        {
            id: 'demo-wishbook-2',
            authorId: G3,
            guestName: 'Priya Patel',
            message: "Watching you two grow together has been the greatest honor. May your love only deepen with time. I'm so proud of you, Riley.",
            daysAgo: -13,
        },
        {
            id: 'demo-wishbook-3',
            authorId: G4,
            guestName: 'Marcus Webb',
            message: "Cheers to the two people who deserve every bit of happiness. Can't wait to see what's next for you both!",
            daysAgo: -12,
        },
        {
            id: 'demo-wishbook-4',
            authorId: G6,
            guestName: 'Diego Fernandez',
            message: 'From the whole family — welcome, Alex. We already love you like our own.',
            daysAgo: -13,
        },
        {
            id: 'demo-wishbook-5',
            authorId: G5,
            guestName: 'Nina Kowalski',
            message: "Still can't believe my college roommate found her person. So happy for you! 💕",
            daysAgo: -11,
        },
        {
            id: 'demo-wishbook-6',
            authorId: null,
            guestName: 'The Ramirez Family',
            message: 'Congratulations on your beautiful wedding — wishing you endless joy!',
            daysAgo: -10,
        },
    ];

    return entries.map((entry) => ({
        id: entry.id,
        eventId: DEMO_EVENT_ID,
        authorMemberId: entry.authorId,
        guestName: entry.guestName,
        message: entry.message,
        createdAt: DAYS(entry.daysAgo),
        canDelete: true,
    }));
}

// --- RSVPs ---

export function buildSeedRsvps(): RsvpResponseDto[] {
    const entries: {
        id: string;
        memberId: string;
        status: RsvpResponseDto['attendanceStatus'];
        adults: number;
        children: number;
        daysAgo: number;
    }[] = [
        { id: 'demo-rsvp-1', memberId: G1, status: 'ATTENDING', adults: 2, children: 0, daysAgo: -35 },
        { id: 'demo-rsvp-2', memberId: G2, status: 'ATTENDING', adults: 1, children: 0, daysAgo: -33 },
        { id: 'demo-rsvp-3', memberId: G3, status: 'ATTENDING', adults: 1, children: 0, daysAgo: -50 },
        { id: 'demo-rsvp-4', memberId: G4, status: 'ATTENDING', adults: 1, children: 0, daysAgo: -50 },
        { id: 'demo-rsvp-5', memberId: G5, status: 'ATTENDING', adults: 2, children: 1, daysAgo: -25 },
        { id: 'demo-rsvp-6', memberId: G6, status: 'DECLINED', adults: 0, children: 0, daysAgo: -20 },
    ];

    return entries.map((entry) => ({
        id: entry.id,
        eventMemberId: entry.memberId,
        attendanceStatus: entry.status,
        phone: null,
        adultCount: entry.adults,
        childCount: entry.children,
        notes: null,
        submittedAt: DAYS(entry.daysAgo),
        updatedAt: DAYS(entry.daysAgo),
    }));
}

// --- Stories ---

export function buildSeedStories(): StoryResponseDto[] {
    const members = buildSeedMembers();
    const entries: { id: string; authorId: string; mediaId: string; caption: string; seen: boolean }[] = [
        { id: 'demo-story-1', authorId: DEMO_HOST_MEMBER_ID, mediaId: 'demo-media-getting-ready-bride', caption: 'Getting ready! 💄', seen: true },
        { id: 'demo-story-2', authorId: DEMO_HOST_MEMBER_ID, mediaId: 'demo-media-venue', caption: 'Almost time 🥂', seen: true },
        {
            id: 'demo-story-3',
            authorId: DEMO_COHOST_MEMBER_ID,
            mediaId: 'demo-media-getting-ready-groom',
            caption: 'Nervous but so ready',
            seen: false,
        },
        { id: 'demo-story-4', authorId: G3, mediaId: 'demo-media-rings', caption: 'Maid of honor duties ✅', seen: false },
        { id: 'demo-story-5', authorId: G4, mediaId: 'demo-media-toast', caption: 'Speech rehearsal round 12', seen: false },
        { id: 'demo-story-6', authorId: G1, mediaId: 'demo-media-dancefloor', caption: 'This party though 🔥', seen: true },
    ];

    return entries.map((entry) => ({
        id: entry.id,
        eventId: DEMO_EVENT_ID,
        authorMemberId: entry.authorId,
        author: authorFor(entry.authorId, members),
        mediaId: entry.mediaId,
        caption: entry.caption,
        songUrl: null,
        expiresAt: DAYS(1),
        createdAt: DAYS(-1),
        deletedAt: null,
        viewedByCurrentUser: entry.seen,
    }));
}

// --- Playlist suggestions ---

export function buildSeedPlaylistSuggestions(): PlaylistSuggestionResponseDto[] {
    const entries: {
        id: string;
        authorId: string;
        title: string;
        artist: string;
        comment: string | null;
        up: number;
        down: number;
        daysAgo: number;
    }[] = [
        {
            id: 'demo-suggestion-1',
            authorId: G1,
            title: 'Perfect',
            artist: 'Ed Sheeran',
            comment: 'Great for the first dance!',
            up: 8,
            down: 0,
            daysAgo: -20,
        },
        {
            id: 'demo-suggestion-2',
            authorId: G3,
            title: "Can't Help Falling in Love",
            artist: 'Elvis Presley',
            comment: null,
            up: 6,
            down: 0,
            daysAgo: -18,
        },
        {
            id: 'demo-suggestion-3',
            authorId: G4,
            title: 'Uptown Funk',
            artist: 'Mark Ronson ft. Bruno Mars',
            comment: 'This will get everyone on the floor',
            up: 10,
            down: 1,
            daysAgo: -15,
        },
        { id: 'demo-suggestion-4', authorId: G5, title: 'September', artist: 'Earth, Wind & Fire', comment: null, up: 7, down: 0, daysAgo: -12 },
        {
            id: 'demo-suggestion-5',
            authorId: G2,
            title: 'Dancing Queen',
            artist: 'ABBA',
            comment: 'A classic wedding must-have',
            up: 5,
            down: 1,
            daysAgo: -10,
        },
    ];

    return entries.map((entry) => ({
        id: entry.id,
        eventId: DEMO_EVENT_ID,
        authorMemberId: entry.authorId,
        title: entry.title,
        artist: entry.artist,
        youtubeUrl: null,
        spotifyUrl: null,
        comment: entry.comment,
        upvoteCount: entry.up,
        downvoteCount: entry.down,
        myVote: null,
        createdAt: DAYS(entry.daysAgo),
        deletedAt: null,
    }));
}

// --- Gift account ---

export function buildSeedGiftAccount(): EventGiftAccountResponseDto {
    return {
        id: 'demo-gift-account-1',
        eventId: DEMO_EVENT_ID,
        iban: 'GR1601101250000000012300695',
        accountHolder: 'Alex Rivera & Riley Chen',
        bankName: 'Willowbrook National Bank',
        note: "Your presence is the best gift of all — but if you'd like to help us start our new home, a contribution here means the world to us. Thank you! 🤍",
        updatedAt: DAYS(-20),
    };
}

// --- Modules ---

export function buildSeedModules(): EventModuleResponseDto[] {
    return EVENT_MODULE_KEYS.map((moduleKey, index) => ({
        id: `demo-module-${index}`,
        eventId: DEMO_EVENT_ID,
        moduleKey,
        isEnabled: true,
        configuration: {},
        createdAt: DAYS(-30),
        isAvailable: true,
    }));
}

// --- Sessions ---

export function buildSeedSessions(): EventSessionResponseDto[] {
    return [
        {
            id: DEMO_SESSION_ID,
            eventId: DEMO_EVENT_ID,
            title: 'Ceremony & Reception',
            description: 'Join us as we say "I do" and celebrate late into the night.',
            startAt: DAYS(14),
            endAt: DAYS(14),
            locationName: 'Willowbrook Gardens',
            mapsUrl: null,
            displayOrder: 0,
            isMain: true,
            isSecondary: false,
            rsvpEnabled: false,
            createdAt: DAYS(-30),
            deletedAt: null,
        },
        {
            id: DEMO_SESSION_SECONDARY_ID,
            eventId: DEMO_EVENT_ID,
            title: 'Rehearsal Dinner',
            description: 'A relaxed dinner with close family and the wedding party the night before.',
            startAt: DAYS(13),
            endAt: DAYS(13),
            locationName: 'The Garden Bistro',
            mapsUrl: null,
            displayOrder: 1,
            isMain: false,
            isSecondary: true,
            rsvpEnabled: false,
            createdAt: DAYS(-30),
            deletedAt: null,
        },
    ];
}

// --- Event ---

export function buildSeedEvent(): EventDetailResponseDto {
    return {
        id: DEMO_EVENT_ID,
        title: 'Alex & Riley’s Wedding',
        subtitle: 'Try every host tool on a real sample event',
        description: 'This is a demo event — everything you add here stays in your browser only.',
        eventType: 'WEDDING',
        visibility: 'PRIVATE',
        schedule: {
            startAt: DAYS(14),
            endAt: DAYS(14),
            coverageEndsAt: DAYS(14 + 365),
            projectedCoverage: null,
            timezone: 'UTC',
            rsvpDeadline: DAYS(7),
        },
        location: { name: 'Willowbrook Gardens', address: '123 Garden Way', mapsUrl: null },
        coverMedia: mediaById(DEMO_BANNER_MEDIA_ID),
        brandingSettings: {},
        hosts: [
            { id: 'demo-host-1', eventId: DEMO_EVENT_ID, memberId: DEMO_HOST_MEMBER_ID, displayOrder: 0, createdAt: DAYS(-60) },
            { id: 'demo-host-2', eventId: DEMO_EVENT_ID, memberId: DEMO_COHOST_MEMBER_ID, displayOrder: 1, createdAt: DAYS(-60) },
        ],
        modules: buildSeedModules(),
        sessions: buildSeedSessions(),
        rsvpSummary: { totalMembers: 8, attending: 5, declined: 1, noResponse: 2 },
        createdAt: DAYS(-60),
        updatedAt: NOW(),
        deletedAt: null,
        deletionScheduledFor: null,
        status: 'ACTIVE',
    };
}

// --- QR links ---

export function buildSeedQrLinks(): QrLinkResponseDto[] {
    return [
        {
            id: 'demo-qr-1',
            eventId: DEMO_EVENT_ID,
            token: 'demo-qr-token-1',
            publicUrl: 'https://example.com/q/demo-qr-token-1',
            targetType: 'MEDIA_UPLOAD',
            targetId: null,
            status: 'ACTIVE',
            maxGuests: null,
            label: 'Table QR code',
            labelKey: null,
            metadata: {},
            autoGenerated: false,
            expiresAt: null,
            revokedAt: null,
            createdByUserId: DEMO_USER_ID,
            createdAt: DAYS(-10),
            updatedAt: DAYS(-10),
        },
    ];
}

export function buildSeedQrLinkStats(): QrLinkStatsDto[] {
    return [
        {
            qrLinkId: 'demo-qr-1',
            label: 'Table QR code',
            labelKey: null,
            targetType: 'MEDIA_UPLOAD',
            status: 'ACTIVE',
            joinCount: 6,
            maxGuests: null,
            remainingSlots: null,
            lastJoinedAt: DAYS(-1),
            uploadCount: 14,
        },
    ];
}

export function buildSeedUsage(): EventUsageResponseDto {
    return {
        eventId: DEMO_EVENT_ID,
        planTier: 'FREE',
        storageBytes: 512 * 1024,
        planStorageBytes: 5 * 1024 * 1024 * 1024,
        extraStorageBytes: 0,
        storageLimitBytes: 5 * 1024 * 1024 * 1024,
        storagePercent: 0,
        memberCount: 10,
        memberLimit: 100,
        memberPercent: 10,
    };
}

export function buildSeedBilling(): EventBillingResponseDto {
    return {
        eventStatus: 'ACTIVE',
        planTierCode: 'FREE',
        planTierName: 'Free',
        coverageOptionId: 'demo-coverage-12',
        coverageMonths: 12,
        orders: [],
        addons: [],
        discount: null,
    };
}

export function buildSeedAppConfig(): AppConfigResponseDto {
    return {
        featureFlags: [],
        media: {
            maxFileSizeBytes: 25 * 1024 * 1024,
            maxRequestSizeBytes: 260 * 1024 * 1024,
            maxImageBytes: 25 * 1024 * 1024,
            maxVideoBytes: 200 * 1024 * 1024,
            maxStoryVideoBytes: 100 * 1024 * 1024,
            maxStoryVideoDurationSeconds: 60,
            maxBatchUploadFiles: 10,
            maxBatchStoryItems: 10,
            maxMediaPerPost: 10,
            maxArchiveSelectedItems: 200,
            maxArchivePartBytes: 500 * 1024 * 1024,
            presignedUrlTtlMinutes: 15,
            publicHost: null,
            estimateAvgImageBytes: 4 * 1024 * 1024,
            estimateAvgVideoBytes: 90 * 1024 * 1024,
            estimateImageRatio: 0.7,
        },
        pagination: { defaultPageSize: 20, maxPageSize: 100 },
        planTiers: [
            {
                id: 'demo-plan-free',
                code: 'FREE',
                scope: 'EVENT',
                name: 'Free',
                description: 'The demo plan tier.',
                sortOrder: 0,
                isDefault: true,
                isAssignable: true,
                isPublic: true,
                storageBytes: 5 * 1024 * 1024 * 1024,
                maxMembers: 100,
                // An EVENT plan is priced per duration.
                priceAmountMinor: null,
                priceCurrency: 'USD',
                billingPeriod: null,
                discountPercent: null,
                discountLabel: null,
                discountStartsAt: null,
                discountEndsAt: null,
                moduleKeys: [...EVENT_MODULE_KEYS],
                paidModules: [],
                eventTypeKey: 'WEDDING',
                sharedGroupKey: null,
                initialOptions: [{ id: 'demo-coverage-12', kind: 'INITIAL', months: 12, priceAmountMinor: 0, sortOrder: 0, active: true }],
                extensionOptions: [],
            },
        ],
        paidServices: [],
        eventModuleKeys: [...EVENT_MODULE_KEYS],
        modules: buildSeedModules().map((module_, index) => ({
            id: `demo-platform-module-${index}`,
            moduleKey: module_.moduleKey,
            name: module_.moduleKey[0].toUpperCase() + module_.moduleKey.slice(1),
            description: null,
            isEnabled: true,
            sortOrder: index,
        })),
        eventTypes: [{ id: 'demo-event-type-wedding', eventTypeKey: 'WEDDING', icon: 'heart', accentToken: 'rose', isEnabled: true, sortOrder: 0 }],
        eventTypeKeys: ['WEDDING'],
        translations: { eventTypes: {} },
        rsvp: { minAdults: 0, maxAdults: 10, minChildren: 0, maxChildren: 10 },
        withdrawal: { termsVersion: 'demo-1', windowDays: 14, holdDays: 7 },
        coverage: { maxLeadDays: 548, defaultEventDurationHours: 24 },
        contentLimits: {
            postContentMaxLength: 500,
            commentContentMaxLength: 500,
            storyCaptionMaxLength: 200,
            wishbookMessageMaxLength: 2000,
            playlistSuggestionCommentMaxLength: 300,
            rsvpNotesMaxLength: 500,
            eventDescriptionMaxLength: 2000,
            eventSessionDescriptionMaxLength: 1000,
            moderationReasonMaxLength: 500,
            reportDescriptionMaxLength: 1000,
            reportResolutionNotesMaxLength: 1000,
            catalogDescriptionMaxLength: 1000,
        },
        reactionTypesByEventType: {
            WEDDING: [
                { id: 'demo-reaction-love', eventTypeKey: 'WEDDING', code: 'LOVE', name: 'Love', emoji: '❤️', sortOrder: 0, isAssignable: true },
                { id: 'demo-reaction-like', eventTypeKey: 'WEDDING', code: 'LIKE', name: 'Like', emoji: '👍', sortOrder: 1, isAssignable: true },
                { id: 'demo-reaction-haha', eventTypeKey: 'WEDDING', code: 'HAHA', name: 'Haha', emoji: '😂', sortOrder: 2, isAssignable: true },
                { id: 'demo-reaction-wow', eventTypeKey: 'WEDDING', code: 'WOW', name: 'Wow', emoji: '😮', sortOrder: 3, isAssignable: true },
            ],
        },
        rateLimits: [],
        reportTargetTypes: ['POST', 'COMMENT', 'MEMBER'],
        reportReasons: ['SPAM', 'HARASSMENT', 'INAPPROPRIATE_CONTENT', 'IMPERSONATION', 'OTHER'],
        newsletter: { enabled: false, discountPercent: 10, rewardValidityMonths: 12 },
    };
}
