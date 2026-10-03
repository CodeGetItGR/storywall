import { http, HttpResponse, passthrough } from 'msw';

import type { Page } from '@/lib/api/pagination';
import type {
    AuthorDto,
    EventBillingResponseDto,
    EventDetailResponseDto,
    EventGiftAccountResponseDto,
    EventMemberResponseDto,
    MediaResponseDto,
    PostResponseDto,
    QrLinkStatsDto,
    RsvpResponseDto,
    UserResponseDto,
} from '@/lib/api/types';
import type { DemoSession } from '@/lib/demo/demoSession';
import { type MockDb } from '@/lib/demo/mockDb';
import { buildDemoRsvpReport } from '@/lib/demo/rsvpReport';
import { isRsvpReportType } from '@/lib/rsvpReport';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

function toPage<T>(items: T[], page: number, size: number): Page<T> {
    const start = page * size;
    const content = items.slice(start, start + size);
    return { content, page: { size, number: page, totalElements: items.length, totalPages: Math.max(1, Math.ceil(items.length / size)) } };
}

// Bare-array list endpoints (members, modules, sessions, rsvps, stories, invitations,
// qr links, playlist suggestions, ...). `path` uses MSW's :param syntax and must contain
// an :eventId segment unless `filterByEventId` is false.
export function buildArrayHandlers<Schema extends Record<string, { id: string }[]>, K extends keyof Schema & string>(
    db: MockDb<{ [P in keyof Schema]: Schema[P][number] }>,
    collection: K,
    path: string,
    filterByEventId = true,
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
    pageSize: number,
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
    options: { patch?: boolean; del?: boolean } = {},
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
            }),
        );
    }

    if (options.del) {
        handlers.push(
            http.delete(`${API_BASE_URL}${path}`, ({ params }) => {
                db.remove(collection, params.id as string);
                return new HttpResponse(null, { status: 204 });
            }),
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
    buildRecord: (body: Record<string, unknown>) => Schema[K][number],
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

// --- The demo session's handlers ---

// The only requests a demo session may send to the backend (guide §1). Everything else under
// /api is either served from the session's local store or blocked by the catch-all below.
export const DEMO_ALLOWED_BACKEND_PATHS = ['/api/config', '/api/demo/:eventTypeKey'] as const;

export const DEMO_BLOCKED_HEADER = 'x-storywall-demo-blocked';

let nextId = 0;
// Every prefix starts with `demo-`: isLocalDemoContentId tells the visitor's content apart by it.
function newId(prefix: string): string {
    nextId += 1;
    return `${prefix}-${Date.now()}-${nextId}`;
}

function nowIso(): string {
    return new Date().toISOString();
}

function blockedResponse(request: Request) {
    console.error(`[demo] Blocked ${request.method} ${request.url} — demo sessions stay in this browser.`);
    return HttpResponse.json({ title: 'Not available in the demo', status: 501 }, { status: 501, headers: { [DEMO_BLOCKED_HEADER]: '1' } });
}

// Object URLs keep uploads in this browser (and out of localStorage). Outside a browser
// (tests) there is no object URL support, so fall back to a placeholder.
function localMediaUrl(file: File): string {
    return typeof URL.createObjectURL === 'function' ? URL.createObjectURL(file) : `blob:demo/${file.name}`;
}

// Content a visitor creates as a member shows that member's picture and role, like its seeded content.
export function authorFromMember(member: EventMemberResponseDto | undefined): AuthorDto | null {
    if (!member) return null;
    return {
        memberId: member.id,
        displayName: member.displayName,
        nickname: member.nickname,
        role: member.role,
        avatarUrl: member.avatarUrl,
        roleKey: member.relationshipRole ?? null,
        customRole: member.customRelationshipRole ?? null,
    };
}

// `appOrigin` is this app's own origin, whose /api route handlers also reach the backend.
export function createDemoHandlers(session: DemoSession, appOrigin: string | null = globalThis.location?.origin ?? null) {
    const { db, eventId, viewerMemberId } = session;

    function authorForMember(memberId: string | null): AuthorDto | null {
        return authorFromMember(memberId ? db.get('members', memberId) : undefined);
    }

    function currentEvent(): EventDetailResponseDto | undefined {
        const event = db.get('events', eventId);
        if (!event) return undefined;
        const sessions = db.list('sessions');
        // Keep the event's own null when it has no sessions and none were added.
        return { ...event, modules: db.list('modules'), sessions: event.sessions === null && sessions.length === 0 ? null : sessions };
    }

    // The visitor's own account. Nothing to accept, so the Guidelines gate stays down.
    function me(): UserResponseDto {
        const createdAt = currentEvent()?.createdAt ?? nowIso();
        return {
            id: session.viewerUserId,
            email: null,
            emailVerified: true,
            firstName: db.get('members', viewerMemberId)?.displayName ?? null,
            lastName: null,
            profilePictureUrl: null,
            authProvider: 'LOCAL',
            isGuestAccount: false,
            status: 'ACTIVE',
            platformRole: 'USER',
            eventCreationLocked: false,
            createdAt,
            updatedAt: createdAt,
            deletedAt: null,
            locale: null,
            guidelinesAcceptanceRequired: false,
            currentGuidelinesVersion: null,
        };
    }

    function billing(): EventBillingResponseDto {
        return {
            eventStatus: currentEvent()?.status ?? 'ACTIVE',
            planTierCode: session.usage.planTier,
            planTierName: session.planTierName,
            coverageOptionId: '',
            coverageMonths: 0,
            orders: [],
            addons: [],
            discount: null,
            storageTrimDueAt: null,
        };
    }

    // The snapshot carries no QR scan stats, so every link starts at zero.
    function qrLinkStats(): QrLinkStatsDto[] {
        return db.list('qrLinks').map((link) => ({
            qrLinkId: link.id,
            label: link.label,
            labelKey: link.labelKey,
            targetType: link.targetType,
            status: link.status,
            joinCount: 0,
            maxGuests: link.maxGuests,
            remainingSlots: link.maxGuests,
            lastJoinedAt: null,
            uploadCount: 0,
        }));
    }

    function createLocalMedia(file: File): MediaResponseDto {
        const url = localMediaUrl(file);
        return db.create('media', {
            id: newId('demo-local-media'),
            eventId,
            uploaderMemberId: viewerMemberId,
            anonymousUploaderName: null,
            storageKey: `demo/${file.name}`,
            mediaUrl: url,
            status: 'READY',
            thumbnailUrl: url,
            originalFilename: file.name,
            mimeType: file.type,
            mediaType: file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE',
            fileSize: file.size,
            width: null,
            height: null,
            durationSeconds: null,
            metadata: {},
            createdAt: nowIso(),
            deletedAt: null,
        });
    }

    return [
        // --- Allowed backend calls ---
        http.get(`${API_BASE_URL}/api/config`, () => passthrough()),
        http.get(`${API_BASE_URL}/api/demo/:eventTypeKey`, () => passthrough()),

        // --- Me ---
        http.get(`${API_BASE_URL}/api/me`, () => HttpResponse.json(me())),
        // A language change saves nothing in the demo.
        http.patch(`${API_BASE_URL}/api/me`, () => HttpResponse.json(me())),
        http.get(`${API_BASE_URL}/api/me/events`, () => HttpResponse.json(db.list('members').filter((m) => m.id === viewerMemberId))),

        // --- Live feed stream: nothing to stream in a local demo. 404 stops the hook's retries. ---
        http.post(`${API_BASE_URL}/api/events/:eventId/stream-token`, () => new HttpResponse(null, { status: 404 })),

        // --- Event detail and settings ---
        http.get(`${API_BASE_URL}/api/events/:eventId`, ({ params }) => {
            const event = params.eventId === eventId ? currentEvent() : undefined;
            return event ? HttpResponse.json(event) : new HttpResponse(null, { status: 404 });
        }),
        http.patch(`${API_BASE_URL}/api/events/:eventId`, async ({ params, request }) => {
            if (params.eventId !== eventId) return new HttpResponse(null, { status: 404 });
            const body = (await request.json()) as Record<string, unknown>;
            db.update('events', eventId, (event) => {
                // Only fields the response already has, so request-only keys don't leak into it.
                const known = Object.fromEntries(Object.entries(body).filter(([key]) => key in event));
                return { ...event, ...known, updatedAt: nowIso() };
            });
            return HttpResponse.json(currentEvent());
        }),
        http.get(`${API_BASE_URL}/api/events/:eventId/usage`, () => HttpResponse.json(session.usage)),
        http.get(`${API_BASE_URL}/api/events/:eventId/billing`, () => HttpResponse.json(billing())),
        http.get(`${API_BASE_URL}/api/events/:eventId/upgrade-options`, () => HttpResponse.json([])),
        http.get(`${API_BASE_URL}/api/events/:eventId/extension-options`, () => HttpResponse.json([])),
        http.get(`${API_BASE_URL}/api/events/:eventId/qr-links/stats`, () => HttpResponse.json(qrLinkStats())),

        // --- Gift account (one per event; absent when the module is off) ---
        http.get(`${API_BASE_URL}/api/events/:eventId/gift-account`, ({ params }) => {
            const account = db.list('giftAccounts').find((a) => a.eventId === params.eventId);
            return account ? HttpResponse.json(account) : new HttpResponse(null, { status: 404 });
        }),
        http.put(`${API_BASE_URL}/api/events/:eventId/gift-account`, async ({ params, request }) => {
            const body = (await request.json()) as Record<string, unknown>;
            const targetEventId = params.eventId as string;
            const existing = db.list('giftAccounts').find((a) => a.eventId === targetEventId);
            const record: EventGiftAccountResponseDto = {
                id: existing?.id ?? newId('demo-gift-account'),
                eventId: targetEventId,
                iban: String(body.iban ?? ''),
                accountHolder: String(body.accountHolder ?? ''),
                bankName: String(body.bankName ?? ''),
                note: (body.note as string) ?? null,
                updatedAt: nowIso(),
            };
            if (existing) db.update('giftAccounts', existing.id, () => record);
            else db.create('giftAccounts', record);
            return HttpResponse.json(record);
        }),
        http.delete(`${API_BASE_URL}/api/events/:eventId/gift-account`, ({ params }) => {
            const existing = db.list('giftAccounts').find((a) => a.eventId === params.eventId);
            if (existing) db.remove('giftAccounts', existing.id);
            return new HttpResponse(null, { status: 204 });
        }),

        // --- Members ---
        ...buildArrayHandlers(db, 'members', '/api/events/:eventId/members'),
        ...buildDetailHandlers(db, 'members', '/api/event-members/:id', { patch: true }),
        buildCreateHandler(db, 'members', '/api/event-members', (body) => ({
            id: newId('demo-member'),
            eventId,
            userId: null,
            invitationId: null,
            role: (body.role as EventMemberResponseDto['role']) ?? 'ATTENDEE',
            displayName: String(body.displayName ?? 'Guest'),
            nickname: (body.nickname as string) ?? null,
            relationshipRole: null,
            customRelationshipRole: null,
            isFeatured: Boolean(body.isFeatured),
            avatarUrl: null,
            joinedAt: nowIso(),
            rsvpId: null,
            createdAt: nowIso(),
            updatedAt: nowIso(),
            deletedAt: null,
        })),

        // --- Modules / sessions ---
        ...buildArrayHandlers(db, 'modules', '/api/events/:eventId/modules'),
        ...buildArrayHandlers(db, 'sessions', '/api/events/:eventId/sessions'),
        ...buildDetailHandlers(db, 'sessions', '/api/event-sessions/:id', { patch: true }),

        // --- Invitations / QR links (read-only in the demo) ---
        ...buildArrayHandlers(db, 'invitations', '/api/events/:eventId/invitations'),
        ...buildArrayHandlers(db, 'qrLinks', '/api/events/:eventId/qr-links'),

        // --- RSVPs ---
        http.get(`${API_BASE_URL}/api/events/:eventId/rsvps/report`, ({ request }) => {
            const reportType = new URL(request.url).searchParams.get('reportType') ?? '';
            const event = currentEvent();
            if (!isRsvpReportType(reportType) || !event) return new HttpResponse(null, { status: 400 });
            return HttpResponse.json(
                buildDemoRsvpReport({
                    members: db.list('members'),
                    rsvps: db.list('rsvps'),
                    event,
                    reportType,
                    locale: request.headers.get('Accept-Language') ?? 'en',
                }),
            );
        }),
        // RsvpResponseDto has no eventId field (only eventMemberId), so this list can't be
        // filtered by event the way the other collections are.
        ...buildArrayHandlers(db, 'rsvps', '/api/events/:eventId/rsvps', false),
        ...buildDetailHandlers(db, 'rsvps', '/api/rsvps/:id', { patch: true, del: true }),
        buildCreateHandler(db, 'rsvps', '/api/rsvps', (body) => ({
            id: newId('demo-rsvp'),
            eventMemberId: String(body.eventMemberId),
            attendanceStatus: (body.attendanceStatus as RsvpResponseDto['attendanceStatus']) ?? 'ATTENDING',
            phone: (body.phone as string) ?? null,
            adultCount: Number(body.adultCount ?? 0),
            childCount: Number(body.childCount ?? 0),
            notes: (body.notes as string) ?? null,
            submittedAt: nowIso(),
            updatedAt: nowIso(),
        })),

        // --- Wishbook ---
        ...buildPageHandlers(db, 'wishbook', '/api/events/:eventId/wishbook', 20),
        http.get(`${API_BASE_URL}/api/events/:eventId/wishbook/count`, () => HttpResponse.json(db.list('wishbook').length)),
        buildCreateHandler(db, 'wishbook', '/api/events/:eventId/wishbook', (body) => ({
            id: newId('demo-wishbook'),
            eventId,
            authorMemberId: null,
            guestName: String(body.guestName ?? 'Guest'),
            message: String(body.message ?? ''),
            createdAt: nowIso(),
            canDelete: true,
        })),
        ...buildDetailHandlers(db, 'wishbook', '/api/wishbook/:id', { del: true }),

        // --- Media (uploads stay in this browser as object URLs) ---
        ...buildPageHandlers(db, 'media', '/api/events/:eventId/media', 30),
        ...buildDetailHandlers(db, 'media', '/api/medias/:id', { del: true }),
        http.get(`${API_BASE_URL}/api/events/:eventId/media/summary`, () => {
            const media = db.list('media');
            return HttpResponse.json({
                photoCount: media.filter((m) => m.mediaType === 'IMAGE').length,
                videoCount: media.filter((m) => m.mediaType === 'VIDEO').length,
            });
        }),
        http.post(`${API_BASE_URL}/api/events/:eventId/media`, async ({ request }) => {
            const form = await request.formData();
            return HttpResponse.json(createLocalMedia(form.get('file') as File), { status: 201 });
        }),
        http.post(`${API_BASE_URL}/api/events/:eventId/media/batch`, async ({ request }) => {
            const form = await request.formData();
            const created = (form.getAll('files') as File[]).map(createLocalMedia);
            return HttpResponse.json({ created, failed: [] });
        }),

        // --- Posts ---
        ...buildPageHandlers(db, 'posts', '/api/events/:eventId/posts', 20),
        ...buildDetailHandlers(db, 'posts', '/api/posts/:id', { patch: true, del: true }),
        http.get(`${API_BASE_URL}/api/posts/:postId/media`, ({ params }) => HttpResponse.json(db.get('posts', params.postId as string)?.media ?? [])),
        buildCreateHandler(db, 'posts', '/api/posts', (body) => {
            const authorMemberId = typeof body.authorMemberId === 'string' ? body.authorMemberId : null;
            const mediaIds = (body.mediaIds as string[] | undefined) ?? [];
            return {
                id: newId('demo-post'),
                eventId,
                authorMemberId,
                author: authorForMember(authorMemberId),
                type: (body.type as PostResponseDto['type']) ?? 'TEXT',
                content: (body.content as string) ?? null,
                isPinned: Boolean(body.isPinned),
                media: db.list('media').filter((m) => mediaIds.includes(m.id)),
                commentCount: 0,
                recentComments: [],
                reactionCount: 0,
                reactionCounts: {},
                myReactionType: null,
                createdAt: nowIso(),
                updatedAt: nowIso(),
                deletedAt: null,
            };
        }),

        // --- Comments / reactions ---
        http.get(`${API_BASE_URL}/api/posts/:postId/comments`, ({ request, params }) => {
            const page = Number(new URL(request.url).searchParams.get('page') ?? '0');
            return HttpResponse.json(
                toPage(
                    db.list('comments').filter((c) => c.postId === params.postId),
                    page,
                    30,
                ),
            );
        }),
        buildCreateHandler(db, 'comments', '/api/comments', (body) => {
            const authorMemberId = typeof body.authorMemberId === 'string' ? body.authorMemberId : null;
            return {
                id: newId('demo-comment'),
                postId: String(body.postId),
                authorMemberId,
                author: authorForMember(authorMemberId),
                parentCommentId: (body.parentCommentId as string) ?? null,
                content: String(body.content ?? ''),
                createdAt: nowIso(),
                updatedAt: nowIso(),
                deletedAt: null,
            };
        }),
        ...buildDetailHandlers(db, 'comments', '/api/comments/:id', { del: true }),
        http.get(`${API_BASE_URL}/api/posts/:postId/reactions`, ({ params }) =>
            HttpResponse.json(db.list('reactions').filter((r) => r.postId === params.postId)),
        ),
        buildCreateHandler(db, 'reactions', '/api/reactions', (body) => ({
            id: newId('demo-reaction'),
            postId: String(body.postId),
            memberId: String(body.memberId),
            reactionType: String(body.reactionType),
            createdAt: nowIso(),
        })),
        ...buildDetailHandlers(db, 'reactions', '/api/reactions/:id', { del: true }),

        // --- Stories ---
        ...buildArrayHandlers(db, 'stories', '/api/events/:eventId/stories'),
        ...buildDetailHandlers(db, 'stories', '/api/stories/:id', { del: true }),
        buildCreateHandler(db, 'stories', '/api/stories', (body) => {
            const authorMemberId = typeof body.authorMemberId === 'string' ? body.authorMemberId : null;
            return {
                id: newId('demo-story'),
                eventId,
                authorMemberId,
                author: authorForMember(authorMemberId),
                mediaId: String(body.mediaId),
                caption: (body.caption as string) ?? null,
                songUrl: (body.songUrl as string) ?? null,
                expiresAt: (body.expiresAt as string) ?? new Date(Date.now() + 86_400_000).toISOString(),
                createdAt: nowIso(),
                deletedAt: null,
                viewedByCurrentUser: false,
            };
        }),
        http.post(`${API_BASE_URL}/api/stories/:id/views`, ({ params }) => {
            db.update('stories', params.id as string, (story) => ({ ...story, viewedByCurrentUser: true }));
            return HttpResponse.json({ id: newId('demo-story-view'), storyId: params.id, memberId: viewerMemberId, createdAt: nowIso() });
        }),

        // --- Playlist suggestions ---
        ...buildArrayHandlers(db, 'playlistSuggestions', '/api/events/:eventId/playlist-suggestions'),
        buildCreateHandler(db, 'playlistSuggestions', '/api/playlist-suggestions', (body) => ({
            id: newId('demo-suggestion'),
            eventId,
            authorMemberId: (body.authorMemberId as string) ?? null,
            title: String(body.title ?? ''),
            artist: (body.artist as string) ?? null,
            youtubeUrl: (body.youtubeUrl as string) ?? null,
            spotifyUrl: (body.spotifyUrl as string) ?? null,
            comment: (body.comment as string) ?? null,
            upvoteCount: 0,
            downvoteCount: 0,
            myVote: null,
            createdAt: nowIso(),
            deletedAt: null,
        })),

        // --- Guard: anything else aimed at the backend (or at this app's own /api routes, which
        // talk to the backend) never leaves the browser. Must stay last. ---
        http.all(`${API_BASE_URL}/api/*`, ({ request }) => blockedResponse(request)),
        ...(appOrigin && appOrigin !== API_BASE_URL ? [http.all(`${appOrigin}/api/*`, ({ request }) => blockedResponse(request))] : []),
    ];
}
