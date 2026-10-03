// @vitest-environment node
import type { SetupServer } from 'msw/node';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Proves a demo session never sends anything to the backend except the snapshot and /api/config:
// every request below goes through the session's real MSW handlers, and any request MSW did not
// answer itself is recorded as having left the browser.
const API = 'http://api.test';

type Recorded = { method: string; url: string };

let server: SetupServer;
let left: Recorded[] = [];
let blockedHeader = '';

async function send(method: string, path: string, body?: unknown, base = API): Promise<Response> {
    const init: RequestInit = { method };
    if (body instanceof FormData) init.body = body;
    else if (body !== undefined) {
        init.body = JSON.stringify(body);
        init.headers = { 'Content-Type': 'application/json' };
    }
    try {
        return await fetch(`${base}${path}`, init);
    } catch {
        // A passthrough request has no real server to reach in tests.
        return new Response(null, { status: 599 });
    }
}

beforeAll(async () => {
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', API);
    vi.resetModules();

    const { setupServer } = await import('msw/node');
    const { createDemoHandlers, DEMO_BLOCKED_HEADER } = await import('@/lib/demo/mockHandlers');
    const { createDemoSession } = await import('@/lib/demo/demoSession');
    const { buildFixtureSnapshot } = await import('@/lib/demo/__fixtures__/demoSnapshot');
    const { rebaseSnapshot } = await import('@/lib/demo/snapshotRebase');

    blockedHeader = DEMO_BLOCKED_HEADER;
    const session = createDemoSession('WEDDING', rebaseSnapshot(buildFixtureSnapshot()), 'v1', 'Free');
    server = setupServer(...createDemoHandlers(session, 'http://localhost'));
    // Every request starts here; the ones a handler answered locally are removed again.
    const pending = new Map<string, Recorded>();
    server.events.on('request:start', ({ request, requestId }) => {
        const entry = { method: request.method, url: request.url };
        pending.set(requestId, entry);
        left.push(entry);
    });
    server.events.on('response:mocked', ({ requestId }) => {
        const entry = pending.get(requestId);
        left = left.filter((item) => item !== entry);
    });
    server.listen({ onUnhandledRequest: 'bypass' });
});

afterAll(() => {
    server?.close();
    vi.unstubAllEnvs();
});

beforeEach(() => {
    left = [];
});

describe('demo network guard', () => {
    it('serves reads from the local store', async () => {
        const reads = [
            '/api/events/evt-demo',
            '/api/events/evt-demo/members',
            '/api/events/evt-demo/posts?page=0',
            '/api/events/evt-demo/stories',
            '/api/events/evt-demo/rsvps',
            '/api/events/evt-demo/media?page=0',
            '/api/events/evt-demo/wishbook?page=0',
            '/api/events/evt-demo/playlist-suggestions',
            '/api/events/evt-demo/qr-links',
            '/api/events/evt-demo/qr-links/stats',
            '/api/events/evt-demo/usage',
            '/api/events/evt-demo/billing',
            '/api/events/evt-demo/modules',
            '/api/events/evt-demo/sessions',
            '/api/posts/post-1/comments?page=0',
            '/api/posts/post-1/reactions',
            '/api/medias/med-1',
            '/api/me/events',
        ];
        for (const path of reads) {
            const res = await send('GET', path);
            expect(res.status, path).toBeLessThan(400);
        }
        expect(left).toEqual([]);
    });

    it('keeps writes local and visible to later reads', async () => {
        const created = await send('POST', '/api/posts', { eventId: 'evt-demo', authorMemberId: 'mem-host', type: 'TEXT', content: 'Local only' });
        expect(created.status).toBe(201);
        const post = (await created.json()) as { id: string };

        const page = (await (await send('GET', '/api/events/evt-demo/posts?page=0')).json()) as { content: { id: string }[] };
        expect(page.content.map((p) => p.id)).toContain(post.id);

        await send('POST', '/api/comments', { postId: post.id, authorMemberId: 'mem-host', content: 'hi' });
        await send('POST', '/api/reactions', { postId: post.id, memberId: 'mem-host', reactionType: 'LOVE' });
        await send('POST', '/api/rsvps', { eventMemberId: 'mem-host', attendanceStatus: 'ATTENDING' });
        await send('POST', '/api/playlist-suggestions', { title: 'Song' });
        await send('POST', '/api/events/evt-demo/wishbook', { guestName: 'A', message: 'B' });
        await send('PATCH', '/api/events/evt-demo', { title: 'Renamed' });
        await send('PUT', '/api/events/evt-demo/gift-account', { iban: 'X', accountHolder: 'Y', bankName: 'Z' });
        await send('DELETE', `/api/posts/${post.id}`);

        const form = new FormData();
        form.append('file', new File(['x'], 'photo.jpg', { type: 'image/jpeg' }));
        const upload = await send('POST', '/api/events/evt-demo/media', form);
        expect(upload.status).toBe(201);
        expect(((await upload.json()) as { mediaUrl: string }).mediaUrl.startsWith('blob:')).toBe(true);

        const event = (await (await send('GET', '/api/events/evt-demo')).json()) as { title: string };
        expect(event.title).toBe('Renamed');
        expect(left).toEqual([]);
    });

    it("keeps a post's comment count and preview in step with its comments", async () => {
        type PostRead = { commentCount: number; recentComments: { id: string }[] };
        const readPost = async () => (await (await send('GET', '/api/posts/post-1')).json()) as PostRead;

        const created = await send('POST', '/api/comments', { postId: 'post-1', authorMemberId: 'mem-host', content: 'Second' });
        const comment = (await created.json()) as { id: string };
        const afterCreate = await readPost();
        expect(afterCreate.commentCount).toBe(2);
        expect(afterCreate.recentComments.map((item) => item.id)).toEqual(['cmt-1', comment.id]);

        await send('DELETE', `/api/comments/${comment.id}`);
        const afterDelete = await readPost();
        expect(afterDelete.commentCount).toBe(1);
        expect(afterDelete.recentComments.map((item) => item.id)).toEqual(['cmt-1']);
        expect(left).toEqual([]);
    });

    it('blocks every other backend request instead of letting it through', async () => {
        const attempts: [string, string, string?][] = [
            ['GET', '/api/admin/demo-events'],
            ['POST', '/api/auth/login'],
            ['POST', '/api/events/evt-demo/storage-checkout'],
            ['GET', '/api/notifications'],
            ['DELETE', '/api/events/evt-demo'],
            ['GET', '/api/some/future/endpoint'],
            // This app's own route handlers talk to the backend too.
            ['GET', '/api/auth/session', 'http://localhost'],
        ];
        for (const [method, path, base] of attempts) {
            const res = await send(method, path, undefined, base);
            expect(res.status, `${method} ${path}`).toBe(501);
            expect(res.headers.get(blockedHeader), `${method} ${path}`).toBe('1');
        }
        expect(left).toEqual([]);
    });

    it('stops the live feed stream without contacting the backend', async () => {
        const res = await send('POST', '/api/events/evt-demo/stream-token');
        expect(res.status).toBe(404);
        expect(left).toEqual([]);
    });

    it('lets only the snapshot and /api/config reach the backend', async () => {
        await send('GET', '/api/config');
        await send('GET', '/api/demo/WEDDING');
        await send('POST', '/api/demo/WEDDING');
        expect(left).toEqual([
            { method: 'GET', url: `${API}/api/config` },
            { method: 'GET', url: `${API}/api/demo/WEDDING` },
        ]);
    });
});
