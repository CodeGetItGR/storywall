import { http, HttpResponse } from 'msw';

import type { Page } from '@/lib/api/pagination';
import type {
    CommentResponseDto,
    EventInvitationResponseDto,
    EventMemberResponseDto,
    EventModuleResponseDto,
    EventSessionResponseDto,
    MediaResponseDto,
    PlaylistSuggestionResponseDto,
    PostResponseDto,
    QrLinkResponseDto,
    ReactionResponseDto,
    RsvpResponseDto,
    StoryResponseDto,
    WishbookEntryResponseDto,
} from '@/lib/api/types';
import { DEMO_EVENT_ID, DEMO_HOST_MEMBER_ID } from '@/lib/demo/demoConstants';
import { createMockDb, type MockDb } from '@/lib/demo/mockDb';
import {
    buildSeedAppConfig,
    buildSeedBilling,
    buildSeedEvent,
    buildSeedInvitations,
    buildSeedMedia,
    buildSeedMembers,
    buildSeedModules,
    buildSeedPosts,
    buildSeedQrLinks,
    buildSeedQrLinkStats,
    buildSeedRsvps,
    buildSeedSessions,
    buildSeedStories,
    buildSeedUsage,
    buildSeedWishbookEntries,
} from '@/lib/demo/seedData';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

function toPage<T>(items: T[], page: number, size: number): Page<T> {
    const start = page * size;
    const content = items.slice(start, start + size);
    return { content, totalElements: items.length, totalPages: Math.max(1, Math.ceil(items.length / size)), number: page, size };
}

// Bare-array list endpoints (members, modules, sessions, rsvps, stories, invitations,
// qr links, playlist suggestions, ...). `path` uses MSW's :param syntax and must contain
// an :eventId segment unless `filterByEventId` is false.
export function buildArrayHandlers<Schema extends Record<string, { id: string }[]>, K extends keyof Schema & string>(
    db: MockDb<{ [P in keyof Schema]: Schema[P][number] }>,
    collection: K,
    path: string,
    filterByEventId = true
) {
    return [
        http.get(`${API_BASE_URL}${path}`, ({ params }) => {
            const all = db.list(collection);
            if (!filterByEventId) return HttpResponse.json(all);
            const eventId = params.eventId as string;
            return HttpResponse.json((all as { eventId?: string }[]).filter((r) => r.eventId === eventId));
        }),
    ];
}

// Page<T> list endpoints (posts, wishbook entries, media) — newest-first.
export function buildPageHandlers<Schema extends Record<string, { id: string }[]>, K extends keyof Schema & string>(
    db: MockDb<{ [P in keyof Schema]: Schema[P][number] }>,
    collection: K,
    path: string,
    pageSize: number
) {
    return [
        http.get(`${API_BASE_URL}${path}`, ({ request, params }) => {
            const url = new URL(request.url);
            const page = Number(url.searchParams.get('page') ?? '0');
            const eventId = params.eventId as string;
            const items = (db.list(collection) as { eventId?: string; createdAt?: string }[])
                .filter((r) => r.eventId === eventId)
                .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
            return HttpResponse.json(toPage(items, page, pageSize));
        }),
    ];
}

// A single record by :id, with optional PATCH/DELETE.
export function buildDetailHandlers<Schema extends Record<string, { id: string }[]>, K extends keyof Schema & string>(
    db: MockDb<{ [P in keyof Schema]: Schema[P][number] }>,
    collection: K,
    path: string,
    options: { patch?: boolean; del?: boolean } = {}
) {
    const handlers = [
        http.get(`${API_BASE_URL}${path}`, ({ params }) => {
            const record = db.get(collection, params.id as string);
            return record ? HttpResponse.json(record) : new HttpResponse(null, { status: 404 });
        }),
    ];

    if (options.patch) {
        handlers.push(
            http.patch(`${API_BASE_URL}${path}`, async ({ params, request }) => {
                const body = (await request.json()) as Record<string, unknown>;
                const updated = db.update(collection, params.id as string, (record) => ({ ...record, ...body }));
                return updated ? HttpResponse.json(updated) : new HttpResponse(null, { status: 404 });
            })
        );
    }

    if (options.del) {
        handlers.push(
            http.delete(`${API_BASE_URL}${path}`, ({ params }) => {
                db.remove(collection, params.id as string);
                return new HttpResponse(null, { status: 204 });
            })
        );
    }

    return handlers;
}

// A create endpoint — `buildRecord` turns the request body into a full stored record
// (assigning an id, timestamps, and any denormalized fields the response DTO needs).
export function buildCreateHandler<Schema extends Record<string, { id: string }[]>, K extends keyof Schema & string>(
    db: MockDb<{ [P in keyof Schema]: Schema[P][number] }>,
    collection: K,
    path: string,
    buildRecord: (body: Record<string, unknown>) => Schema[K][number]
) {
    // The response body type can't be inferred through Schema's generic here — MSW's
    // http.post infers it from the resolver's return value, but Schema isn't concrete at
    // this factory's definition site. Widen to `never` rather than losing type safety on
    // `buildRecord`'s own signature above, which is where the real check matters.
    return http.post(`${API_BASE_URL}${path}`, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        const record = db.create(collection, buildRecord(body));
        return HttpResponse.json(record as never, { status: 201 });
    });
}

// --- The demo's own schema and seeded singleton store ---

const DEMO_DB_STORAGE_KEY = 'storywall:demo:db:v1';

type DemoSchema = {
    posts: PostResponseDto[];
    comments: CommentResponseDto[];
    reactions: ReactionResponseDto[];
    media: MediaResponseDto[];
    members: EventMemberResponseDto[];
    modules: EventModuleResponseDto[];
    sessions: EventSessionResponseDto[];
    rsvps: RsvpResponseDto[];
    stories: StoryResponseDto[];
    wishbook: WishbookEntryResponseDto[];
    invitations: EventInvitationResponseDto[];
    qrLinks: QrLinkResponseDto[];
    playlistSuggestions: PlaylistSuggestionResponseDto[];
};

function seedDemoSchema(): DemoSchema {
    return {
        posts: buildSeedPosts(),
        comments: [],
        reactions: [],
        media: buildSeedMedia(),
        members: buildSeedMembers(),
        modules: buildSeedModules(),
        sessions: buildSeedSessions(),
        rsvps: buildSeedRsvps(),
        stories: buildSeedStories(),
        wishbook: buildSeedWishbookEntries(),
        invitations: buildSeedInvitations(),
        qrLinks: buildSeedQrLinks(),
        playlistSuggestions: [],
    };
}

export const demoDb = createMockDb<DemoSchema>(DEMO_DB_STORAGE_KEY, seedDemoSchema);

let nextId = 0;
function newId(prefix: string): string {
    nextId += 1;
    return `${prefix}-${Date.now()}-${nextId}`;
}

async function fileToDataUrl(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    return `data:${file.type};base64,${base64}`;
}

export const demoHandlers = [
    // --- Global config (public) ---
    http.get(`${API_BASE_URL}/api/config`, () => HttpResponse.json(buildSeedAppConfig())),

    // --- Auth / me ---
    http.get(`${API_BASE_URL}/api/me/events`, () =>
        HttpResponse.json([demoDb.list('members').find((m) => m.id === DEMO_HOST_MEMBER_ID)!])
    ),

    // --- Event detail ---
    http.get(`${API_BASE_URL}/api/events/:eventId`, ({ params }) =>
        params.eventId === DEMO_EVENT_ID ? HttpResponse.json(buildSeedEvent()) : new HttpResponse(null, { status: 404 })
    ),
    http.get(`${API_BASE_URL}/api/events/:eventId/usage`, () => HttpResponse.json(buildSeedUsage())),
    http.get(`${API_BASE_URL}/api/events/:eventId/billing`, () => HttpResponse.json(buildSeedBilling())),
    http.get(`${API_BASE_URL}/api/events/:eventId/qr-links/stats`, () => HttpResponse.json(buildSeedQrLinkStats())),

    // --- Members ---
    ...buildArrayHandlers(demoDb, 'members', '/api/events/:eventId/members'),
    ...buildDetailHandlers(demoDb, 'members', '/api/event-members/:id', { patch: true }),
    buildCreateHandler(demoDb, 'members', '/api/event-members', (body) => ({
        id: newId('demo-member'),
        eventId: DEMO_EVENT_ID,
        userId: null,
        invitationId: null,
        role: (body.role as EventMemberResponseDto['role']) ?? 'ATTENDEE',
        displayName: String(body.displayName ?? 'Guest'),
        nickname: (body.nickname as string) ?? null,
        relationshipRole: (body.relationshipRole as string) ?? null,
        customRelationshipRole: (body.customRelationshipRole as string) ?? null,
        isFeatured: Boolean(body.isFeatured),
        avatarMediaId: (body.avatarMediaId as string) ?? null,
        joinedAt: new Date().toISOString(),
        rsvpId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
    })),

    // --- Modules ---
    ...buildArrayHandlers(demoDb, 'modules', '/api/events/:eventId/modules'),
    ...buildDetailHandlers(demoDb, 'modules', '/api/event-modules/:id', { patch: true, del: true }),

    // --- Sessions ---
    ...buildArrayHandlers(demoDb, 'sessions', '/api/events/:eventId/sessions'),
    ...buildDetailHandlers(demoDb, 'sessions', '/api/event-sessions/:id', { patch: true }),

    // --- Invitations / QR links (read-only in the demo) ---
    ...buildArrayHandlers(demoDb, 'invitations', '/api/events/:eventId/invitations'),
    ...buildArrayHandlers(demoDb, 'qrLinks', '/api/events/:eventId/qr-links'),

    // --- RSVPs ---
    ...buildArrayHandlers(demoDb, 'rsvps', '/api/events/:eventId/rsvps'),
    ...buildDetailHandlers(demoDb, 'rsvps', '/api/rsvps/:id', { patch: true, del: true }),
    buildCreateHandler(demoDb, 'rsvps', '/api/rsvps', (body) => ({
        id: newId('demo-rsvp'),
        eventMemberId: String(body.eventMemberId),
        attendanceStatus: (body.attendanceStatus as RsvpResponseDto['attendanceStatus']) ?? 'ATTENDING',
        phone: (body.phone as string) ?? null,
        adultCount: Number(body.adultCount ?? 0),
        childCount: Number(body.childCount ?? 0),
        notes: (body.notes as string) ?? null,
        submittedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    })),

    // --- Wishbook ---
    ...buildPageHandlers(demoDb, 'wishbook', '/api/events/:eventId/wishbook', 20),
    http.get(`${API_BASE_URL}/api/events/:eventId/wishbook/count`, () => HttpResponse.json(demoDb.list('wishbook').length)),
    buildCreateHandler(demoDb, 'wishbook', '/api/events/:eventId/wishbook', (body) => ({
        id: newId('demo-wishbook'),
        eventId: DEMO_EVENT_ID,
        authorMemberId: null,
        guestName: String(body.guestName ?? 'Guest'),
        message: String(body.message ?? ''),
        createdAt: new Date().toISOString(),
        canDelete: true,
    })),
    ...buildDetailHandlers(demoDb, 'wishbook', '/api/wishbook/:id', { del: true }),

    // --- Media ---
    ...buildPageHandlers(demoDb, 'media', '/api/events/:eventId/media', 30),
    ...buildDetailHandlers(demoDb, 'media', '/api/medias/:id', { del: true }),
    http.post(`${API_BASE_URL}/api/events/:eventId/media`, async ({ request }) => {
        const form = await request.formData();
        const file = form.get('file') as File;
        const media = demoDb.create('media', {
            id: newId('demo-media'),
            eventId: DEMO_EVENT_ID,
            uploaderMemberId: DEMO_HOST_MEMBER_ID,
            anonymousUploaderName: null,
            storageKey: `demo/${file.name}`,
            mediaUrl: await fileToDataUrl(file),
            status: 'READY',
            thumbnailUrl: await fileToDataUrl(file),
            originalFilename: file.name,
            mimeType: file.type,
            mediaType: file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE',
            fileSize: file.size,
            width: null,
            height: null,
            durationSeconds: null,
            metadata: {},
            createdAt: new Date().toISOString(),
            deletedAt: null,
        });
        return HttpResponse.json(media, { status: 201 });
    }),
    http.post(`${API_BASE_URL}/api/events/:eventId/media/batch`, async ({ request }) => {
        const form = await request.formData();
        const files = form.getAll('files') as File[];
        const created = await Promise.all(
            files.map(async (file) =>
                demoDb.create('media', {
                    id: newId('demo-media'),
                    eventId: DEMO_EVENT_ID,
                    uploaderMemberId: DEMO_HOST_MEMBER_ID,
                    anonymousUploaderName: null,
                    storageKey: `demo/${file.name}`,
                    mediaUrl: await fileToDataUrl(file),
                    status: 'READY',
                    thumbnailUrl: await fileToDataUrl(file),
                    originalFilename: file.name,
                    mimeType: file.type,
                    mediaType: file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE',
                    fileSize: file.size,
                    width: null,
                    height: null,
                    durationSeconds: null,
                    metadata: {},
                    createdAt: new Date().toISOString(),
                    deletedAt: null,
                })
            )
        );
        return HttpResponse.json({ created, failed: [] });
    }),

    // --- Posts ---
    ...buildPageHandlers(demoDb, 'posts', '/api/events/:eventId/posts', 20),
    ...buildDetailHandlers(demoDb, 'posts', '/api/posts/:id', { patch: true, del: true }),
    http.get(`${API_BASE_URL}/api/posts/:postId/media`, ({ params }) => {
        const post = demoDb.get('posts', params.postId as string);
        return HttpResponse.json(post?.media ?? []);
    }),
    buildCreateHandler(demoDb, 'posts', '/api/posts', (body) => {
        const author = demoDb.list('members').find((m) => m.id === body.authorMemberId) ?? null;
        const mediaIds = (body.mediaIds as string[] | undefined) ?? [];
        return {
            id: newId('demo-post'),
            eventId: DEMO_EVENT_ID,
            authorMemberId: (body.authorMemberId as string) ?? null,
            author: author
                ? { memberId: author.id, displayName: author.displayName, nickname: author.nickname, role: author.role, avatarMediaId: null, avatarUrl: null }
                : null,
            type: (body.type as PostResponseDto['type']) ?? 'TEXT',
            content: (body.content as string) ?? null,
            isPinned: Boolean(body.isPinned),
            media: demoDb.list('media').filter((m) => mediaIds.includes(m.id)),
            commentCount: 0,
            reactionCount: 0,
            reactionCounts: {},
            myReactionType: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            deletedAt: null,
        };
    }),

    // --- Comments / reactions ---
    http.get(`${API_BASE_URL}/api/posts/:postId/comments`, ({ request, params }) => {
        const url = new URL(request.url);
        const page = Number(url.searchParams.get('page') ?? '0');
        const items = demoDb.list('comments').filter((c) => c.postId === params.postId);
        return HttpResponse.json(toPage(items, page, 30));
    }),
    buildCreateHandler(demoDb, 'comments', '/api/comments', (body) => ({
        id: newId('demo-comment'),
        postId: String(body.postId),
        authorMemberId: (body.authorMemberId as string) ?? null,
        parentCommentId: (body.parentCommentId as string) ?? null,
        content: String(body.content ?? ''),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
    })),
    ...buildDetailHandlers(demoDb, 'comments', '/api/comments/:id', { del: true }),
    http.get(`${API_BASE_URL}/api/posts/:postId/reactions`, ({ params }) =>
        HttpResponse.json(demoDb.list('reactions').filter((r) => r.postId === params.postId))
    ),
    buildCreateHandler(demoDb, 'reactions', '/api/reactions', (body) => ({
        id: newId('demo-reaction'),
        postId: String(body.postId),
        memberId: String(body.memberId),
        reactionType: String(body.reactionType),
        createdAt: new Date().toISOString(),
    })),
    ...buildDetailHandlers(demoDb, 'reactions', '/api/reactions/:id', { del: true }),

    // --- Stories ---
    ...buildArrayHandlers(demoDb, 'stories', '/api/events/:eventId/stories'),
    ...buildDetailHandlers(demoDb, 'stories', '/api/stories/:id', { del: true }),
    buildCreateHandler(demoDb, 'stories', '/api/stories', (body) => ({
        id: newId('demo-story'),
        eventId: DEMO_EVENT_ID,
        authorMemberId: (body.authorMemberId as string) ?? null,
        mediaId: String(body.mediaId),
        caption: (body.caption as string) ?? null,
        songUrl: (body.songUrl as string) ?? null,
        expiresAt: (body.expiresAt as string) ?? new Date(Date.now() + 86_400_000).toISOString(),
        createdAt: new Date().toISOString(),
        deletedAt: null,
        viewedByCurrentUser: false,
    })),
    http.post(`${API_BASE_URL}/api/stories/:id/views`, ({ params }) => {
        demoDb.update('stories', params.id as string, (story) => ({ ...story, viewedByCurrentUser: true }));
        return HttpResponse.json({ id: newId('demo-story-view'), storyId: params.id, memberId: DEMO_HOST_MEMBER_ID, createdAt: new Date().toISOString() });
    }),

    // --- Playlist suggestions ---
    ...buildArrayHandlers(demoDb, 'playlistSuggestions', '/api/events/:eventId/playlist-suggestions'),
    buildCreateHandler(demoDb, 'playlistSuggestions', '/api/playlist-suggestions', (body) => ({
        id: newId('demo-suggestion'),
        eventId: DEMO_EVENT_ID,
        authorMemberId: (body.authorMemberId as string) ?? null,
        title: String(body.title ?? ''),
        artist: (body.artist as string) ?? null,
        youtubeUrl: (body.youtubeUrl as string) ?? null,
        spotifyUrl: (body.spotifyUrl as string) ?? null,
        comment: (body.comment as string) ?? null,
        upvoteCount: 0,
        downvoteCount: 0,
        myVote: null,
        createdAt: new Date().toISOString(),
        deletedAt: null,
    })),
];
