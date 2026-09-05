import type {
    AppConfigResponseDto,
    EventBillingResponseDto,
    EventDetailResponseDto,
    EventInvitationResponseDto,
    EventMemberResponseDto,
    EventModuleResponseDto,
    EventSessionResponseDto,
    EventUsageResponseDto,
    MediaResponseDto,
    PostResponseDto,
    QrLinkResponseDto,
    QrLinkStatsDto,
    RsvpResponseDto,
    StoryResponseDto,
    WishbookEntryResponseDto,
} from '@/lib/api/types';
import { DEMO_EVENT_ID, DEMO_HOST_MEMBER_ID, DEMO_USER_ID } from '@/lib/demo/demoConstants';

const NOW = () => new Date().toISOString();
const DAYS = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();

// A tiny 1x1 transparent PNG — used as the seed photos' placeholder data URL so the
// demo never needs to ship real binary sample assets.
const PLACEHOLDER_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

export const DEMO_SESSION_ID = 'demo-session-main';

export function buildSeedMedia(): MediaResponseDto[] {
    return [
        {
            id: 'demo-media-1',
            eventId: DEMO_EVENT_ID,
            uploaderMemberId: DEMO_HOST_MEMBER_ID,
            anonymousUploaderName: null,
            storageKey: 'demo/media-1.png',
            mediaUrl: PLACEHOLDER_IMAGE,
            status: 'READY',
            thumbnailUrl: PLACEHOLDER_IMAGE,
            originalFilename: 'first-dance.png',
            mimeType: 'image/png',
            mediaType: 'IMAGE',
            fileSize: 1024,
            width: 1,
            height: 1,
            durationSeconds: null,
            metadata: {},
            createdAt: DAYS(-2),
            deletedAt: null,
        },
        {
            id: 'demo-media-2',
            eventId: DEMO_EVENT_ID,
            uploaderMemberId: DEMO_HOST_MEMBER_ID,
            anonymousUploaderName: null,
            storageKey: 'demo/media-2.png',
            mediaUrl: PLACEHOLDER_IMAGE,
            status: 'READY',
            thumbnailUrl: PLACEHOLDER_IMAGE,
            originalFilename: 'toast.png',
            mimeType: 'image/png',
            mediaType: 'IMAGE',
            fileSize: 1024,
            width: 1,
            height: 1,
            durationSeconds: null,
            metadata: {},
            createdAt: DAYS(-1),
            deletedAt: null,
        },
    ];
}

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
            avatarMediaId: null,
            joinedAt: DAYS(-30),
            rsvpId: null,
            createdAt: DAYS(-30),
            updatedAt: DAYS(-30),
            deletedAt: null,
        },
        {
            id: 'demo-member-guest-1',
            eventId: DEMO_EVENT_ID,
            userId: null,
            invitationId: null,
            role: 'ATTENDEE',
            displayName: 'Jordan Lee',
            nickname: null,
            relationshipRole: 'Friend',
            customRelationshipRole: null,
            isFeatured: false,
            avatarMediaId: null,
            joinedAt: DAYS(-20),
            rsvpId: 'demo-rsvp-1',
            createdAt: DAYS(-20),
            updatedAt: DAYS(-20),
            deletedAt: null,
        },
        {
            id: 'demo-member-guest-2',
            eventId: DEMO_EVENT_ID,
            userId: null,
            invitationId: null,
            role: 'ATTENDEE',
            displayName: 'Sam Okafor',
            nickname: null,
            relationshipRole: 'Cousin',
            customRelationshipRole: null,
            isFeatured: false,
            avatarMediaId: null,
            joinedAt: DAYS(-18),
            rsvpId: null,
            createdAt: DAYS(-18),
            updatedAt: DAYS(-18),
            deletedAt: null,
        },
    ];
}

export function buildSeedPosts(): PostResponseDto[] {
    return [
        {
            id: 'demo-post-1',
            eventId: DEMO_EVENT_ID,
            authorMemberId: DEMO_HOST_MEMBER_ID,
            author: {
                memberId: DEMO_HOST_MEMBER_ID,
                displayName: 'Alex Rivera',
                nickname: null,
                role: 'HOST',
                avatarMediaId: null,
                avatarUrl: null,
            },
            type: 'MEDIA',
            content: "Couldn't stop smiling during the first dance 💃",
            isPinned: true,
            media: [buildSeedMedia()[0]],
            commentCount: 1,
            recentComments: [],
            reactionCount: 2,
            reactionCounts: { LOVE: 2 },
            myReactionType: null,
            createdAt: DAYS(-2),
            updatedAt: DAYS(-2),
            deletedAt: null,
        },
        {
            id: 'demo-post-2',
            eventId: DEMO_EVENT_ID,
            authorMemberId: 'demo-member-guest-1',
            author: {
                memberId: 'demo-member-guest-1',
                displayName: 'Jordan Lee',
                nickname: null,
                role: 'ATTENDEE',
                avatarMediaId: null,
                avatarUrl: null,
            },
            type: 'TEXT',
            content: 'So happy to be here celebrating you two! 🎉',
            isPinned: false,
            media: [],
            commentCount: 0,
            recentComments: [],
            reactionCount: 1,
            reactionCounts: { LIKE: 1 },
            myReactionType: null,
            createdAt: DAYS(-1),
            updatedAt: DAYS(-1),
            deletedAt: null,
        },
    ];
}

export function buildSeedWishbookEntries(): WishbookEntryResponseDto[] {
    return [
        {
            id: 'demo-wishbook-1',
            eventId: DEMO_EVENT_ID,
            authorMemberId: 'demo-member-guest-1',
            guestName: 'Jordan Lee',
            message: 'Wishing you a lifetime of love and laughter!',
            createdAt: DAYS(-1),
            canDelete: true,
        },
    ];
}

export function buildSeedRsvps(): RsvpResponseDto[] {
    return [
        {
            id: 'demo-rsvp-1',
            eventMemberId: 'demo-member-guest-1',
            attendanceStatus: 'ATTENDING',
            phone: null,
            adultCount: 2,
            childCount: 0,
            notes: null,
            submittedAt: DAYS(-15),
            updatedAt: DAYS(-15),
        },
    ];
}

export function buildSeedStories(): StoryResponseDto[] {
    return [
        {
            id: 'demo-story-1',
            eventId: DEMO_EVENT_ID,
            authorMemberId: DEMO_HOST_MEMBER_ID,
            mediaId: 'demo-media-2',
            caption: 'Getting ready!',
            songUrl: null,
            expiresAt: DAYS(1),
            createdAt: DAYS(-1),
            deletedAt: null,
            viewedByCurrentUser: true,
        },
    ];
}

export function buildSeedModules(): EventModuleResponseDto[] {
    const enabled: EventModuleResponseDto['moduleKey'][] = ['posts', 'gallery', 'rsvp', 'stories', 'wishbook', 'playlist'];
    return enabled.map((moduleKey, index) => ({
        id: `demo-module-${index}`,
        eventId: DEMO_EVENT_ID,
        moduleKey,
        isEnabled: true,
        configuration: {},
        createdAt: DAYS(-30),
        isAvailable: true,
    }));
}

export function buildSeedSessions(): EventSessionResponseDto[] {
    return [
        {
            id: 'demo-session-main',
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
            createdAt: DAYS(-30),
            deletedAt: null,
        },
    ];
}

export function buildSeedEvent(): EventDetailResponseDto {
    return {
        id: DEMO_EVENT_ID,
        title: 'Alex & Riley’s Wedding',
        subtitle: 'Try every host tool on a real sample event',
        description: 'This is a demo event — everything you add here stays in your browser only.',
        eventType: 'WEDDING',
        visibility: 'PRIVATE',
        schedule: { startAt: DAYS(14), endAt: DAYS(14), timezone: 'UTC', rsvpDeadline: DAYS(7) },
        location: { name: 'Willowbrook Gardens', address: '123 Garden Way', mapsUrl: null },
        coverMedia: buildSeedMedia()[0],
        brandingSettings: {},
        hosts: [{ id: 'demo-host-1', eventId: DEMO_EVENT_ID, memberId: DEMO_HOST_MEMBER_ID, displayOrder: 0, createdAt: DAYS(-30) }],
        modules: buildSeedModules(),
        sessions: buildSeedSessions(),
        rsvpSummary: { totalMembers: 2, attending: 1, declined: 0, noResponse: 1 },
        createdAt: DAYS(-30),
        updatedAt: NOW(),
        deletedAt: null,
        deletionScheduledFor: null,
        status: 'ACTIVE',
    };
}

export function buildSeedInvitations(): EventInvitationResponseDto[] {
    return [
        {
            id: 'demo-invitation-1',
            eventId: DEMO_EVENT_ID,
            inviteCode: 'DEMO1234',
            inviteToken: 'demo-invite-token-1',
            email: 'jordan@example.com',
            firstName: 'Jordan',
            lastName: 'Lee',
            maxGuests: 2,
            expiresAt: null,
            usedAt: DAYS(-20),
            createdAt: DAYS(-25),
            role: 'ATTENDEE',
        },
    ];
}

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
            targetType: 'MEDIA_UPLOAD',
            status: 'ACTIVE',
            joinCount: 3,
            maxGuests: null,
            remainingSlots: null,
            lastJoinedAt: DAYS(-1),
            uploadCount: 5,
        },
    ];
}

export function buildSeedUsage(): EventUsageResponseDto {
    return {
        eventId: DEMO_EVENT_ID,
        planTier: 'FREE',
        storageBytes: 2_048,
        planStorageBytes: 5 * 1024 * 1024 * 1024,
        extraStorageBytes: 0,
        storageLimitBytes: 5 * 1024 * 1024 * 1024,
        storagePercent: 0,
        memberCount: 3,
        memberLimit: 100,
        memberPercent: 3,
    };
}

export function buildSeedBilling(): EventBillingResponseDto {
    return { eventStatus: 'ACTIVE', planTierCode: 'FREE', planTierName: 'Free', orders: [], addons: [] };
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
                priceAmountMinor: 0,
                priceCurrency: 'USD',
                billingPeriod: null,
                discountPercent: null,
                discountLabel: null,
                discountStartsAt: null,
                discountEndsAt: null,
                moduleKeys: ['posts', 'rsvp', 'playlist', 'stories', 'gallery', 'wishbook'],
                paidModules: [],
                eventTypeKeys: ['WEDDING'],
            },
        ],
        paidServices: [],
        eventModuleKeys: ['posts', 'rsvp', 'playlist', 'stories', 'gallery', 'wishlist', 'wishbook'],
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
            ],
        },
        rateLimits: [],
    };
}
