import type {
    AppConfigResponseDto,
    AuthorDto,
    CommentResponseDto,
    EventDetailResponseDto,
    EventMemberResponseDto,
    EventModuleResponseDto,
    EventSessionResponseDto,
    MediaResponseDto,
    ModuleKeyConvention,
    PlanTierResponseDto,
    PostResponseDto,
    QrLinkResponseDto,
    ReactionTypeResponseDto,
    StoryResponseDto,
} from '@/lib/api/types';
import type { AuthUser } from '@/providers/AuthProvider';

// Shared, typed sample data for stories. Every date is relative to the fixed
// story clock in preview.tsx (2026-06-15 12:00 UTC), so "2 hours ago" stays put.

export const STORY_EVENT_ID = 'evt-story';
export const STORY_HOST_MEMBER_ID = 'mem-host';
export const STORY_GUEST_MEMBER_ID = 'mem-guest';

const CREATED_AT = '2026-05-01T09:00:00Z';

function hoursAgo(hours: number): string {
    return new Date(Date.parse('2026-06-15T12:00:00Z') - hours * 3_600_000).toISOString();
}

export const storyUser: AuthUser = {
    userId: 'usr-guest',
    email: 'maria@example.com',
    firstName: 'Maria',
    lastName: 'Papadopoulou',
    profilePictureUrl: null,
    authProvider: 'LOCAL',
    isGuestAccount: false,
    status: 'ACTIVE',
    createdAt: CREATED_AT,
    role: 'USER',
    emailVerified: true,
};

export function storyMember(overrides: Partial<EventMemberResponseDto> = {}): EventMemberResponseDto {
    return {
        id: STORY_GUEST_MEMBER_ID,
        eventId: STORY_EVENT_ID,
        userId: storyUser.userId,
        invitationId: null,
        role: 'ATTENDEE',
        displayName: 'Maria Papadopoulou',
        nickname: null,
        relationshipRole: null,
        customRelationshipRole: null,
        isFeatured: false,
        avatarUrl: null,
        joinedAt: CREATED_AT,
        rsvpId: null,
        createdAt: CREATED_AT,
        updatedAt: CREATED_AT,
        deletedAt: null,
        ...overrides,
    };
}

export const storyHostMember = storyMember({ id: STORY_HOST_MEMBER_ID, role: 'HOST', displayName: 'Eleni Georgiou', userId: 'usr-host' });

export function storyAuthor(overrides: Partial<AuthorDto> = {}): AuthorDto {
    return {
        memberId: STORY_HOST_MEMBER_ID,
        displayName: 'Eleni Georgiou',
        nickname: null,
        role: 'HOST',
        avatarUrl: null,
        roleKey: null,
        customRole: null,
        ...overrides,
    };
}

export const guestAuthor = storyAuthor({ memberId: 'mem-nikos', displayName: 'Nikos Alexiou', role: 'ATTENDEE' });

export function storyMedia(id: string, overrides: Partial<MediaResponseDto> = {}): MediaResponseDto {
    return {
        id,
        eventId: STORY_EVENT_ID,
        uploaderMemberId: STORY_HOST_MEMBER_ID,
        anonymousUploaderName: null,
        storageKey: `media/${id}`,
        mediaUrl: '/images/post-florals.png',
        status: 'READY',
        thumbnailUrl: null,
        originalFilename: `${id}.png`,
        mimeType: 'image/png',
        mediaType: 'IMAGE',
        fileSize: 120_000,
        width: 1200,
        height: 900,
        durationSeconds: null,
        metadata: {},
        createdAt: CREATED_AT,
        deletedAt: null,
        ...overrides,
    };
}

export const storyPhotos = [
    storyMedia('m1', { mediaUrl: '/images/post-florals.png' }),
    storyMedia('m2', { mediaUrl: '/images/post-cake.png' }),
    storyMedia('m3', { mediaUrl: '/images/post-flowers.png' }),
    storyMedia('m4', { mediaUrl: '/images/post-tux.png' }),
    storyMedia('m5', { mediaUrl: '/images/venue.png' }),
];

export function storyComment(id: string, overrides: Partial<CommentResponseDto> = {}): CommentResponseDto {
    return {
        id,
        postId: 'post-1',
        authorMemberId: guestAuthor.memberId,
        author: guestAuthor,
        parentCommentId: null,
        content: 'What a beautiful day!',
        createdAt: hoursAgo(1),
        updatedAt: hoursAgo(1),
        deletedAt: null,
        ...overrides,
    };
}

export function storyPost(overrides: Partial<PostResponseDto> = {}): PostResponseDto {
    return {
        id: 'post-1',
        eventId: STORY_EVENT_ID,
        authorMemberId: STORY_HOST_MEMBER_ID,
        author: storyAuthor(),
        type: 'MEDIA',
        content: 'The flowers are ready. See you all at six!',
        isPinned: false,
        media: [storyPhotos[0]],
        commentCount: 0,
        recentComments: [],
        reactionCount: 0,
        reactionCounts: {},
        myReactionType: null,
        eventType: 'WEDDING',
        createdAt: hoursAgo(2),
        updatedAt: hoursAgo(2),
        deletedAt: null,
        ...overrides,
    };
}

export function storyStory(id: string, author: AuthorDto, overrides: Partial<StoryResponseDto> = {}): StoryResponseDto {
    return {
        id,
        eventId: STORY_EVENT_ID,
        authorMemberId: author.memberId,
        author,
        mediaId: `${id}-media`,
        media: storyMedia(`${id}-media`),
        caption: null,
        songUrl: null,
        expiresAt: '2026-06-16T12:00:00Z',
        createdAt: hoursAgo(3),
        deletedAt: null,
        viewedByCurrentUser: false,
        ...overrides,
    };
}

const ALL_MODULES: ModuleKeyConvention[] = ['posts', 'rsvp', 'playlist', 'stories', 'gallery', 'wishlist', 'wishbook', 'schedule'];

export function storyModules(keys: ModuleKeyConvention[] = ALL_MODULES): EventModuleResponseDto[] {
    return keys.map((moduleKey) => ({
        id: `mod-${moduleKey}`,
        eventId: STORY_EVENT_ID,
        moduleKey,
        isEnabled: true,
        configuration: null,
        createdAt: CREATED_AT,
        isAvailable: true,
    }));
}

export function storySession(overrides: Partial<EventSessionResponseDto> = {}): EventSessionResponseDto {
    return {
        id: 'ses-main',
        eventId: STORY_EVENT_ID,
        title: 'Ceremony',
        description: null,
        startAt: '2026-07-04T15:00:00Z',
        endAt: null,
        locationName: 'Agios Nikolaos church',
        mapsUrl: null,
        displayOrder: 0,
        isMain: true,
        isSecondary: false,
        rsvpEnabled: true,
        createdAt: CREATED_AT,
        deletedAt: null,
        ...overrides,
    };
}

export function storyEvent(overrides: Partial<EventDetailResponseDto> = {}): EventDetailResponseDto {
    return {
        id: STORY_EVENT_ID,
        title: 'Eleni & Nikos',
        subtitle: null,
        description: 'Join us for a summer wedding by the sea.',
        eventType: 'WEDDING',
        visibility: 'PRIVATE',
        schedule: {
            startAt: '2026-07-04T15:00:00Z',
            endAt: '2026-07-05T02:00:00Z',
            coverageEndsAt: '2026-08-04T15:00:00Z',
            projectedCoverage: null,
            timezone: 'Europe/Athens',
            rsvpDeadline: '2026-06-25T21:00:00Z',
        },
        location: { name: 'Santorini', address: null, mapsUrl: null },
        coverMedia: null,
        brandingSettings: {},
        theme: null,
        hosts: [{ id: 'host-1', eventId: STORY_EVENT_ID, memberId: STORY_HOST_MEMBER_ID, displayOrder: 0, createdAt: CREATED_AT }],
        modules: storyModules(),
        sessions: [storySession(), storySession({ id: 'ses-party', title: 'Reception', isMain: false, isSecondary: true, displayOrder: 1 })],
        rsvpSummary: { totalMembers: 48, attending: 31, declined: 4, noResponse: 13 },
        createdAt: CREATED_AT,
        updatedAt: CREATED_AT,
        deletedAt: null,
        deletionScheduledFor: null,
        status: 'ACTIVE',
        suspended: false,
        suspension: null,
        partnerBranding: null,
        partnerBrandingPrompt: null,
        ...overrides,
    };
}

function reactionType(code: string, name: string, emoji: string, sortOrder: number): ReactionTypeResponseDto {
    return { id: `rt-${code}`, eventTypeKey: 'WEDDING', code, name, emoji, sortOrder, isAssignable: true };
}

export const storyReactionTypes = [
    reactionType('LOVE', 'Love', '❤️', 0),
    reactionType('LAUGH', 'Laugh', '😂', 1),
    reactionType('WOW', 'Wow', '😮', 2),
];

// Only the parts of GET /api/config the components in stories read. Add a
// field here when a story needs it, rather than filling the whole shape.
export const storyAppConfig = {
    featureFlags: [],
    withdrawal: { termsVersion: '2026-09-18', windowDays: 14, holdDays: 7 },
    media: { presignedUrlTtlMinutes: 60 },
    pagination: { defaultPageSize: 20, maxPageSize: 100 },
    planTiers: [
        {
            id: 'plan-premium',
            code: 'PREMIUM',
            scope: 'EVENT',
            name: 'Premium',
            isPublic: true,
            isAssignable: true,
            sortOrder: 1,
            moduleKeys: ['posts', 'stories', 'gallery', 'rsvp', 'playlist', 'wishbook'],
        },
    ],
    paidServices: [],
    eventModuleKeys: [],
    modules: [],
    eventTypes: [],
    eventTypeKeys: ['WEDDING'],
    translations: { eventTypes: {} },
    contentLimits: { postContentMaxLength: 500, commentContentMaxLength: 300 },
    reactionTypesByEventType: { WEDDING: storyReactionTypes },
    memberRolesByEventType: {},
    landingCategories: [],
    rateLimits: [],
    reportTargetTypes: ['POST', 'COMMENT', 'MEMBER'],
    reportReasons: [],
    rsvp: { minAdults: 1, maxAdults: 10, minChildren: 0, maxChildren: 10 },
    coverage: { minDaysAfterStart: 1, defaultEventDurationHours: 24 },
    landingReviews: [],
    newsletter: { enabled: false, discountPercent: 10, rewardValidityMonths: 12 },
    eventDeletion: { codeDigits: 6, codeValidMinutes: 15, maxCodeAttempts: 5 },
    betaFeedback: { enabled: false, screenshotMaxBytes: 5_000_000, screenshotMimeTypes: ['image/png'] },
    errorTracking: { enabled: false },
} as unknown as AppConfigResponseDto;

function storyEventTypeCopy(en: string, el: string, taglineEn: string, taglineEl: string) {
    return { name: { en, el }, tagline: { en: taglineEn, el: taglineEl }, voice: {}, modules: {} };
}

const WIZARD_MODULE_KEYS = ['posts', 'gallery', 'qr_cards', 'playlist', 'schedule', 'stories', 'rsvp', 'wishbook', 'co_hosts', 'theme', 'he_or_she'];

function storyWizardPlan(
    code: string,
    sortOrder: number,
    maxMembers: number,
    storageGb: number,
    moduleKeys: string[],
    prices: [number, number][],
    eventTypeKey = 'WEDDING',
) {
    return {
        id: `plan-${code}`,
        code,
        scope: 'EVENT',
        name: code,
        description: null,
        sortOrder,
        isDefault: false,
        isAssignable: true,
        isPublic: true,
        isGiftable: false,
        storageBytes: storageGb * 1024 ** 3,
        maxMembers,
        priceAmountMinor: null,
        priceCurrency: 'EUR',
        billingPeriod: null,
        discountPercent: null,
        discountLabel: null,
        discountStartsAt: null,
        discountEndsAt: null,
        moduleKeys,
        paidModules: [],
        moduleConfigs: {},
        eventTypeKey,
        sharedGroupKey: null,
        initialOptions: prices.map(([months, amount], index) => ({
            id: `${code}-${months}`,
            kind: 'INITIAL',
            months,
            priceAmountMinor: amount,
            promoPriceAmountMinor: null,
            sortOrder: index,
            active: true,
        })),
        extensionOptions: [],
    } as unknown as PlanTierResponseDto;
}

// Wedding plans shaped like staging's: three full plans and one lite plan, plus one baptism plan.
export const storyWizardPlans: PlanTierResponseDto[] = [
    storyWizardPlan(
        'START',
        1,
        150,
        15,
        ['posts', 'gallery', 'qr_cards', 'playlist', 'schedule'],
        [
            [6, 7900],
            [12, 9900],
        ],
    ),
    storyWizardPlan(
        'STORY',
        2,
        300,
        25,
        ['posts', 'gallery', 'qr_cards', 'playlist', 'schedule', 'stories', 'rsvp', 'wishbook'],
        [
            [6, 9900],
            [9, 10900],
            [12, 11900],
        ],
    ),
    storyWizardPlan(
        'SIGNATURE',
        3,
        2500,
        50,
        ['posts', 'gallery', 'qr_cards', 'playlist', 'schedule', 'stories', 'rsvp', 'wishbook', 'co_hosts'],
        [
            [6, 17900],
            [12, 19900],
        ],
    ),
    storyWizardPlan('QR', 4, 300, 10, ['gallery'], [[3, 4900]]),
    storyWizardPlan(
        'BAPTISM',
        1,
        120,
        15,
        ['posts', 'gallery', 'qr_cards', 'playlist', 'schedule', 'rsvp', 'wishbook'],
        [
            [6, 5900],
            [12, 7900],
        ],
        'BAPTISM',
    ),
];

// Two types, so the type step shows its cards instead of the empty state.
export const storyWizardAppConfig = {
    ...storyAppConfig,
    media: {
        presignedUrlTtlMinutes: 60,
        estimateAvgImageBytes: 3_000_000,
        estimateAvgVideoBytes: 40_000_000,
        estimateImageRatio: 0.7,
    },
    modules: WIZARD_MODULE_KEYS.map((moduleKey, sortOrder) => ({
        id: `module-${moduleKey}`,
        moduleKey,
        name: moduleKey,
        description: null,
        isEnabled: true,
        sortOrder,
    })),
    planTiers: storyWizardPlans,
    eventTypes: [
        {
            id: 'type-wedding',
            eventTypeKey: 'WEDDING',
            icon: 'heart',
            accentToken: 'rose',
            isEnabled: true,
            sortOrder: 1,
            imageUrl: null,
            hasDemo: true,
        },
        {
            id: 'type-baptism',
            eventTypeKey: 'BAPTISM',
            icon: 'baby',
            accentToken: 'sky',
            isEnabled: true,
            sortOrder: 2,
            imageUrl: null,
            hasDemo: true,
        },
    ],
    eventTypeKeys: ['WEDDING', 'BAPTISM'],
    translations: {
        eventTypes: {
            WEDDING: storyEventTypeCopy('Wedding', 'Γάμος', 'Every moment of your big day', 'Κάθε στιγμή της μεγάλης μέρας'),
            BAPTISM: storyEventTypeCopy('Baptism', 'Βάπτιση', 'A day to remember', 'Μια μέρα να θυμάστε'),
        },
    },
} as unknown as AppConfigResponseDto;

export function storyQrLink(overrides: Partial<QrLinkResponseDto> = {}): QrLinkResponseDto {
    return {
        id: 'qr-invite',
        eventId: STORY_EVENT_ID,
        token: 'invite-token',
        publicUrl: 'https://storywall.app/q/invite-token',
        targetType: 'EVENT_JOIN',
        targetId: null,
        status: 'ACTIVE',
        maxGuests: null,
        label: null,
        labelKey: null,
        metadata: {},
        autoGenerated: true,
        expiresAt: null,
        revokedAt: null,
        createdByUserId: 'usr-host',
        createdAt: CREATED_AT,
        updatedAt: CREATED_AT,
        ...overrides,
    };
}

// A Spring page envelope (Page<T>) holding every item on one page.
export function storyPage<T>(content: T[], totalElements = content.length) {
    return { content, page: { number: 0, size: 20, totalElements, totalPages: 1 } };
}
