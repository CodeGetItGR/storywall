import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

import type { InvitationDocument } from '@/lib/invitation/document';
import { DRAFT_REVISION_STALE_ERROR_CODE } from '@/lib/invitation/drafts';
import { DRAFT_TOKEN_HEADER } from '@/lib/invitation/draftTokens';
import type { InvitationPublicationDto } from '@/lib/invitation/publication';
import { type SampleDraftDto, sampleDraftDto } from '@/lib/invitation/sampleDraft';

// A fake drafts backend for the editor's tests. Set NEXT_PUBLIC_API_BASE_URL to TEST_API
// (in vi.hoisted) before the API client loads.
export const TEST_API = 'http://api.test';

type SavedBody = { revision: number; document: InvitationDocument };
type PublishBody = { revision: number; slug?: string };

const problem = (status: number, errorCode: number) =>
    HttpResponse.json({ status, errorCode, title: 'Refused' }, { status, headers: { 'Content-Type': 'application/problem+json' } });

export function createDraftServer() {
    let stored: SampleDraftDto = sampleDraftDto();
    const saves: SavedBody[] = [];
    let staleOnce = false;
    // Publishing: the published copy, links already taken, and a refusal for the next publish.
    let publication: InvitationPublicationDto | null = null;
    const publishes: PublishBody[] = [];
    const takenSlugs = new Set<string>(['taken-link']);
    let publishRefusal: number | null = null;
    // A visitor's drafts: started with a token, which a signed-in claim trades for the account.
    let startToken: string | null = null;
    const claims: (string | null)[] = [];
    const attaches: string[] = [];

    // Given to setupServer, so resetHandlers() brings them back after a test overrides one.
    const server = setupServer(
        http.get(`${TEST_API}/api/invitation-drafts/:id`, () => HttpResponse.json(stored)),
        http.post(`${TEST_API}/api/invitation-drafts`, async ({ request }) => {
            const { themeSlug } = (await request.json()) as { themeSlug: string };
            stored = sampleDraftDto({
                id: 'draft-new',
                themeSlug,
                revision: 0,
                token: startToken,
                expiresAt: startToken ? '2099-01-01T00:00:00Z' : null,
            });
            return HttpResponse.json(stored);
        }),
        http.post(`${TEST_API}/api/invitation-drafts/:id/claim`, ({ request }) => {
            const token = request.headers.get(DRAFT_TOKEN_HEADER);
            claims.push(token);
            if (!token) return problem(404, 4004);
            stored = { ...stored, token: null, expiresAt: null };
            return HttpResponse.json(stored);
        }),
        http.put(`${TEST_API}/api/invitation-drafts/:id/event`, async ({ request }) => {
            const { eventId } = (await request.json()) as { eventId: string };
            attaches.push(eventId);
            stored = { ...stored, eventId };
            return HttpResponse.json(stored);
        }),
        http.put(`${TEST_API}/api/invitation-drafts/:id`, async ({ request }) => {
            const body = (await request.json()) as SavedBody;
            saves.push(body);
            if (staleOnce || body.revision !== stored.revision) {
                staleOnce = false;
                return HttpResponse.json(
                    { status: 409, errorCode: DRAFT_REVISION_STALE_ERROR_CODE, title: 'Conflict' },
                    { status: 409, headers: { 'Content-Type': 'application/problem+json' } },
                );
            }
            stored = { ...stored, revision: stored.revision + 1, document: body.document };
            return HttpResponse.json({ id: stored.id, revision: stored.revision, expiresAt: null, updatedAt: '2026-06-15T12:01:00Z' });
        }),
        http.get(`${TEST_API}/api/invitation-drafts/:id/publication`, () => (publication ? HttpResponse.json(publication) : problem(404, 4004))),
        http.post(`${TEST_API}/api/invitation-drafts/:id/publish`, async ({ request }) => {
            const body = (await request.json()) as PublishBody;
            publishes.push(body);
            if (publishRefusal !== null) return problem(409, publishRefusal);
            if (body.revision !== stored.revision) return problem(409, DRAFT_REVISION_STALE_ERROR_CODE);
            const slug = publication?.slug ?? body.slug;
            if (!slug) return problem(400, 5219);
            if (!publication && takenSlugs.has(slug)) return problem(409, 5218);
            publication = {
                draftId: stored.id,
                slug,
                draftRevision: body.revision,
                themeRevision: stored.themeRevision,
                publishedAt: publication?.publishedAt ?? '2026-06-15T12:02:00Z',
                updatedAt: '2026-06-15T12:02:00Z',
                onlineUntil: '2027-06-15T21:00:00Z',
                online: true,
            };
            return HttpResponse.json(publication);
        }),
        http.get(`${TEST_API}/api/invitation-slugs/availability`, ({ request }) => {
            const slug = new URL(request.url).searchParams.get('slug') ?? '';
            if (slug === 'admin') return HttpResponse.json({ slug, available: false, reason: 'RESERVED' });
            const taken = takenSlugs.has(slug);
            return HttpResponse.json({ slug, available: !taken, reason: taken ? 'TAKEN' : null });
        }),
    );

    // Requests still on their way, such as the save the editor sends as it closes.
    let inFlight = 0;
    server.events.on('request:start', () => {
        inFlight += 1;
    });
    // An unhandled request fails without an end event.
    for (const done of ['request:end', 'request:unhandled'] as const) {
        server.events.on(done, () => {
            inFlight -= 1;
        });
    }

    return {
        server,
        // Resolves once no request is on its way. Await it before reset(), or a late save lands
        // on the next test's draft.
        async settled() {
            // The editor's closing save starts a moment after it unmounts.
            do await new Promise((resolve) => setTimeout(resolve, 20));
            while (inFlight > 0);
        },
        saves,
        publishes,
        claims,
        attaches,
        stored: () => stored,
        publication: () => publication,
        // The draft is on an event, so it can be published.
        putOnEvent(eventId = 'event-1') {
            stored = { ...stored, eventId };
        },
        // The draft was published before at this link.
        publishedAt(slug: string) {
            publication = {
                draftId: stored.id,
                slug,
                draftRevision: stored.revision,
                themeRevision: stored.themeRevision,
                publishedAt: '2026-06-01T10:00:00Z',
                updatedAt: '2026-06-01T10:00:00Z',
                onlineUntil: '2027-06-15T21:00:00Z',
                online: true,
            };
        },
        // Someone else publishes at this link between the check and the publish.
        takeSlug(slug: string) {
            takenSlugs.add(slug);
        },
        // Drafts start signed out, opened with this token.
        startWithToken(token: string) {
            startToken = token;
        },
        // Every publish is refused with this error code.
        refusePublish(errorCode: number) {
            publishRefusal = errorCode;
        },
        // Someone else saved the draft: the stored copy moves on without us.
        saveElsewhere(document: InvitationDocument) {
            stored = { ...stored, revision: stored.revision + 1, document };
        },
        // The next save is refused as stale even though the stored copy didn't change,
        // as when an earlier save landed but its answer was lost.
        refuseNextSaveAsStale() {
            staleOnce = true;
        },
        reset() {
            stored = sampleDraftDto();
            saves.length = 0;
            staleOnce = false;
            publication = null;
            publishes.length = 0;
            takenSlugs.clear();
            takenSlugs.add('taken-link');
            publishRefusal = null;
            startToken = null;
            claims.length = 0;
            attaches.length = 0;
        },
    };
}
