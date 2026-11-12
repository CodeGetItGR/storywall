import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

import type { InvitationDocument } from '@/lib/invitation/document';
import { DRAFT_REVISION_STALE_ERROR_CODE } from '@/lib/invitation/drafts';
import { DRAFT_TOKEN_HEADER } from '@/lib/invitation/draftTokens';
import type { InvitationPublicationDto } from '@/lib/invitation/publication';
import { sampleDraftDocument, type SampleDraftDto, sampleDraftDto } from '@/lib/invitation/sampleDraft';
import type { InvitationThemeCardDto } from '@/lib/invitation/themeCatalogue';
import type { InvitationThemePublicDto } from '@/lib/invitation/themePreview';
import { PREVIEW_THEME } from '@/lib/saveMyDatePreview';

// A fake drafts backend for the editor's tests. Set NEXT_PUBLIC_API_BASE_URL to TEST_API
// (in vi.hoisted) before the API client loads.
export const TEST_API = 'http://api.test';

type SavedBody = { revision: number; document: InvitationDocument; themeSlug?: string };
type PublishBody = { revision: number; slug?: string };

// The draft's own theme, and a second wedding theme with no gift list or FAQ, to switch to.
const OLIVE_DOCUMENT = sampleDraftDocument();
export const TEST_THEMES: Record<string, InvitationThemePublicDto> = {
    olive: { slug: 'olive', name: 'Olive', eventType: 'WEDDING', design: PREVIEW_THEME, document: OLIVE_DOCUMENT, assetUrls: {} },
    linen: {
        slug: 'linen',
        name: 'Linen',
        eventType: 'WEDDING',
        design: { ...PREVIEW_THEME, colors: { primary: '#d8c3a5', secondary: '#f4efe6', text: '#3b3226' } },
        document: {
            ...OLIVE_DOCUMENT,
            themeId: 'linen',
            sections: OLIVE_DOCUMENT.sections.filter((section) => section.type !== 'gift' && section.type !== 'faq'),
        },
        assetUrls: {},
    },
};
const themeCard = (theme: InvitationThemePublicDto): InvitationThemeCardDto => ({
    slug: theme.slug,
    name: theme.name,
    eventType: theme.eventType,
    cardColor: null,
    cardThumbUrl: null,
});

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
    // Photos: the names of the files sent, and a refusal for the next upload.
    const uploads: string[] = [];
    let uploadRefusal: { status: number; errorCode: number } | null = null;

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
            const theme = body.themeSlug ? TEST_THEMES[body.themeSlug] : undefined;
            if (body.themeSlug && !theme) return problem(404, 4004);
            stored = theme
                ? {
                      ...stored,
                      revision: stored.revision + 1,
                      document: body.document,
                      themeSlug: theme.slug,
                      themeName: theme.name,
                      design: theme.design,
                  }
                : { ...stored, revision: stored.revision + 1, document: body.document };
            return HttpResponse.json({ id: stored.id, revision: stored.revision, expiresAt: null, updatedAt: '2026-06-15T12:01:00Z' });
        }),
        http.get(`${TEST_API}/api/invitation-themes`, ({ request }) => {
            const eventType = new URL(request.url).searchParams.get('eventType');
            return HttpResponse.json(
                Object.values(TEST_THEMES)
                    .filter((theme) => theme.eventType === eventType)
                    .map(themeCard),
            );
        }),
        http.get(`${TEST_API}/api/invitation-themes/:slug`, ({ params }) => {
            const theme = TEST_THEMES[params.slug as string];
            return theme ? HttpResponse.json(theme) : problem(404, 4004);
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
        http.post(`${TEST_API}/api/invitation-drafts/:id/images`, async ({ request }) => {
            const file = (await request.formData()).get('file');
            uploads.push(typeof file === 'object' && file !== null ? file.name : '');
            if (uploadRefusal) return problem(uploadRefusal.status, uploadRefusal.errorCode);
            const mediaId = `img-${uploads.length}`;
            return HttpResponse.json(
                { mediaId, url: `/images/uploaded-${uploads.length}.jpg`, contentType: 'image/jpeg', width: 1200, height: 800, byteSize: 1000 },
                { status: 201 },
            );
        }),
        http.get(`${TEST_API}/api/invitation-slugs/availability`, ({ request }) => {
            const slug = new URL(request.url).searchParams.get('slug') ?? '';
            if (slug === 'admin') return HttpResponse.json({ slug, available: false, reason: 'RESERVED' });
            const taken = takenSlugs.has(slug);
            return HttpResponse.json({ slug, available: !taken, reason: taken ? 'TAKEN' : null });
        }),
    );

    return {
        server,
        saves,
        publishes,
        claims,
        attaches,
        uploads,
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
        // Every upload is refused with this status and error code.
        refuseUploads(status: number, errorCode: number) {
            uploadRefusal = { status, errorCode };
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
            uploads.length = 0;
            uploadRefusal = null;
        },
    };
}
