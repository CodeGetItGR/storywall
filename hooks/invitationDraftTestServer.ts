import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

import type { InvitationDocument } from '@/lib/invitation/document';
import { DRAFT_REVISION_STALE_ERROR_CODE } from '@/lib/invitation/drafts';
import { type SampleDraftDto, sampleDraftDto } from '@/lib/invitation/sampleDraft';

// A fake drafts backend for the editor's tests. Set NEXT_PUBLIC_API_BASE_URL to TEST_API
// (in vi.hoisted) before the API client loads.
export const TEST_API = 'http://api.test';

type SavedBody = { revision: number; document: InvitationDocument };

export function createDraftServer() {
    let stored: SampleDraftDto = sampleDraftDto();
    const saves: SavedBody[] = [];
    let staleOnce = false;

    // Given to setupServer, so resetHandlers() brings them back after a test overrides one.
    const server = setupServer(
        http.get(`${TEST_API}/api/invitation-drafts/:id`, () => HttpResponse.json(stored)),
        http.post(`${TEST_API}/api/invitation-drafts`, async ({ request }) => {
            const { themeSlug } = (await request.json()) as { themeSlug: string };
            stored = sampleDraftDto({ id: 'draft-new', themeSlug, revision: 0 });
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
    );

    return {
        server,
        saves,
        stored: () => stored,
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
        },
    };
}
