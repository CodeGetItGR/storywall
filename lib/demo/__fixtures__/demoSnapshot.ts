import type { DemoSnapshotDto } from '@/lib/api/types';

// A small, hand-built snapshot for tests. Only the fields the demo code reads are filled in.
export const FIXTURE_EVENT_ID = 'evt-demo';
export const FIXTURE_HOST_MEMBER_ID = 'mem-host';
export const FIXTURE_SNAPSHOT_AT = '2026-01-10T12:00:00Z';

function media(id: string) {
    return {
        id,
        eventId: FIXTURE_EVENT_ID,
        uploaderMemberId: FIXTURE_HOST_MEMBER_ID,
        anonymousUploaderName: null,
        storageKey: `k/${id}`,
        mediaUrl: `https://storage.test/${id}?sig=old`,
        status: 'READY',
        thumbnailUrl: `https://storage.test/${id}-thumb?sig=old`,
        originalFilename: `${id}.jpg`,
        mimeType: 'image/jpeg',
        mediaType: 'IMAGE',
        fileSize: 1000,
        width: 10,
        height: 10,
        durationSeconds: null,
        metadata: {},
        createdAt: '2026-01-10T10:00:00Z',
        deletedAt: null,
    };
}

export function buildFixtureSnapshot(): DemoSnapshotDto {
    const host = {
        id: FIXTURE_HOST_MEMBER_ID,
        eventId: FIXTURE_EVENT_ID,
        userId: 'usr-host',
        invitationId: null,
        role: 'HOST',
        displayName: 'Demo Host',
        nickname: null,
        relationshipRole: null,
        customRelationshipRole: null,
        isFeatured: false,
        avatarUrl: null,
        joinedAt: '2026-01-01T09:00:00Z',
        rsvpId: null,
        createdAt: '2026-01-01T09:00:00Z',
        updatedAt: '2026-01-01T09:00:00Z',
        deletedAt: null,
    };
    const author = { memberId: host.id, displayName: host.displayName, nickname: null, role: 'HOST', avatarUrl: null };

    return {
        snapshotAt: FIXTURE_SNAPSHOT_AT,
        presignedUrlsValidUntil: '2026-01-10T12:40:00Z',
        viewerUserId: 'usr-host',
        viewerMemberId: FIXTURE_HOST_MEMBER_ID,
        event: {
            id: FIXTURE_EVENT_ID,
            title: 'Demo wedding',
            eventType: 'WEDDING',
            schedule: { startAt: '2026-01-24T15:00:00Z', endAt: null, timezone: 'UTC', rsvpDeadline: '2026-01-17T00:00:00Z' },
            coverMedia: media('med-cover'),
            hosts: [],
            modules: [],
            sessions: [],
            status: 'ACTIVE',
            createdAt: '2025-12-01T00:00:00Z',
            updatedAt: '2026-01-10T11:00:00Z',
            deletedAt: null,
        },
        members: [host],
        posts: [
            {
                id: 'post-1',
                eventId: FIXTURE_EVENT_ID,
                authorMemberId: host.id,
                author,
                type: 'PHOTO',
                content: 'Hello',
                isPinned: false,
                media: [media('med-1')],
                commentCount: 1,
                recentComments: [],
                reactionCount: 0,
                reactionCounts: {},
                myReactionType: null,
                createdAt: '2026-01-10T10:00:00Z',
                updatedAt: '2026-01-10T10:00:00Z',
                deletedAt: null,
            },
        ],
        comments: [
            {
                id: 'cmt-1',
                postId: 'post-1',
                authorMemberId: host.id,
                author,
                parentCommentId: null,
                content: 'Nice',
                createdAt: '2026-01-10T11:00:00Z',
                updatedAt: '2026-01-10T11:00:00Z',
                deletedAt: null,
            },
        ],
        reactions: [],
        stories: [
            {
                id: 'story-1',
                eventId: FIXTURE_EVENT_ID,
                authorMemberId: host.id,
                author,
                mediaId: 'med-1',
                caption: null,
                songUrl: null,
                expiresAt: '2026-01-11T11:00:00Z',
                createdAt: '2026-01-10T11:00:00Z',
                deletedAt: null,
                viewedByCurrentUser: false,
            },
        ],
        rsvps: [],
        media: [media('med-cover'), media('med-1')],
        playlistSuggestions: [],
        wishbookEntries: [],
        giftAccount: null,
        qrLinks: [],
        usage: {
            eventId: FIXTURE_EVENT_ID,
            planTier: 'FREE',
            storageBytes: 0,
            planStorageBytes: null,
            extraStorageBytes: 0,
            storageLimitBytes: null,
            storagePercent: 0,
            memberCount: 1,
            memberLimit: null,
            memberPercent: 0,
        },
    } as unknown as DemoSnapshotDto;
}
