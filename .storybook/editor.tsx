import '@/components/saveMyDate/editor/editor.css';

import type { Decorator } from '@storybook/nextjs-vite';
import { http, HttpResponse } from 'msw';

import { DRAFT_REVISION_STALE_ERROR_CODE, readEditableDraft } from '@/lib/invitation/drafts';
import { EDITOR_TOUR_SEEN_KEY } from '@/lib/invitation/editorTour';
import type { InvitationPublicationDto } from '@/lib/invitation/publication';
import { type SampleDraftDto, sampleDraftDto } from '@/lib/invitation/sampleDraft';
import { sampleInvitationPlan } from '@/lib/invitation/samplePlan';

import { STORY_HOST_MEMBER_ID,storyEvent, storyMember } from './fixtures';

// The invitation editor's stories. The editor's parts read its dark colours from .smd-editor.

// A piece of the editor on its dark background.
export const withEditorChrome: Decorator = (Story) => (
    <div className="smd-editor bg-(--smd-editor-panel) p-4 text-(--smd-editor-text)">
        <Story />
    </div>
);

// The whole editor, as tall as the screen, the way the page lays it out. The tour counts as seen,
// so it doesn't cover the editor; withFirstEditorVisit brings it back.
export const withEditorScreen: Decorator = (Story) => {
    markTourSeen(true);
    return (
        <div className="h-svh">
            <Story />
        </div>
    );
};

// The first time this browser opens the editor: the tour opens by itself. Put it on the story, inside withEditorScreen.
export const withFirstEditorVisit: Decorator = (Story) => {
    markTourSeen(false);
    return <Story />;
};

function markTourSeen(seen: boolean) {
    try {
        if (seen) localStorage.setItem(EDITOR_TOUR_SEEN_KEY, '1');
        else localStorage.removeItem(EDITOR_TOUR_SEEN_KEY);
    } catch {
        // No storage: the tour may open.
    }
}

export const storyDraft = () => readEditableDraft(sampleDraftDto());

// A draft on an event, so Publish publishes.
export const storyDraftOnEvent = () => readEditableDraft({ ...sampleDraftDto(), eventId: 'event-1' });

// Publishing a draft on no event: the host's events (a wedding they host when withEvent) and a plan
// with the invitation. Checkout answers with the success page, so nothing leaves the story.
export function eventStepHandlers({ withEvent = false }: { withEvent?: boolean } = {}) {
    const event = storyEvent({ id: 'evt-wedding', eventType: 'WEDDING' });
    const memberships = withEvent ? [storyMember({ id: STORY_HOST_MEMBER_ID, eventId: event.id, role: 'HOST' })] : [];
    return [
        http.get('*/api/me/events', () => HttpResponse.json(memberships)),
        http.get('*/api/events/:eventId', () => HttpResponse.json(event)),
        http.get('*/api/invitation-drafts', () => HttpResponse.json([])),
        http.get('*/api/plan-tiers', () => HttpResponse.json([sampleInvitationPlan()])),
        http.put('*/api/invitation-drafts/:id/event', ({ params }) =>
            HttpResponse.json({ ...sampleDraftDto(), id: String(params.id), eventId: event.id }),
        ),
    ];
}

type PublishOptions = {
    // The link it was published at before. Without it, the first publish asks for one.
    publishedAt?: string;
    // The error code every publish is refused with.
    refusal?: number;
};

const refused = (status: number, errorCode: number) =>
    HttpResponse.json({ status, errorCode, title: 'Refused' }, { status, headers: { 'Content-Type': 'application/problem+json' } });

// A publish backend: "taken-link" is taken and "admin" isn't allowed.
export function publishHandlers({ publishedAt, refusal }: PublishOptions = {}) {
    const draft = sampleDraftDto();
    const publication = (slug: string): InvitationPublicationDto => ({
        draftId: draft.id,
        slug,
        draftRevision: draft.revision,
        themeRevision: draft.themeRevision,
        publishedAt: '2026-06-01T10:00:00Z',
        updatedAt: '2026-06-01T10:00:00Z',
        onlineUntil: '2027-06-15T21:00:00Z',
        online: true,
    });
    return [
        http.get('*/api/invitation-drafts/:id/publication', () => (publishedAt ? HttpResponse.json(publication(publishedAt)) : refused(404, 4004))),
        http.post('*/api/invitation-drafts/:id/publish', async ({ request }) => {
            if (refusal !== undefined) return refused(409, refusal);
            const body = (await request.json()) as { slug?: string };
            return HttpResponse.json(publication(publishedAt ?? body.slug ?? 'our-day'));
        }),
        http.get('*/api/invitation-slugs/availability', ({ request }) => {
            const slug = new URL(request.url).searchParams.get('slug') ?? '';
            if (slug === 'admin') return HttpResponse.json({ slug, available: false, reason: 'RESERVED' });
            const taken = slug === 'taken-link';
            return HttpResponse.json({ slug, available: !taken, reason: taken ? 'TAKEN' : null });
        }),
    ];
}

// A drafts backend that saves.
export function draftHandlers(draft: SampleDraftDto = sampleDraftDto()) {
    let revision = draft.revision;
    return [
        http.get('*/api/invitation-drafts/:id', () => HttpResponse.json({ ...draft, revision })),
        http.put('*/api/invitation-drafts/:id', () => {
            revision += 1;
            return HttpResponse.json({ id: draft.id, revision, expiresAt: null, updatedAt: draft.updatedAt });
        }),
    ];
}

// The draft was saved on another device: every save is stale, and the stored copy has another
// text colour than the one the stories pick.
export function conflictHandlers(draft: SampleDraftDto = sampleDraftDto()) {
    const newer = {
        ...draft,
        revision: draft.revision + 1,
        document: { ...draft.document, overrides: { ...draft.document.overrides, textColor: '#1f4d7a' } },
    };
    return [
        http.get('*/api/invitation-drafts/:id', () => HttpResponse.json(newer)),
        http.put('*/api/invitation-drafts/:id', () =>
            HttpResponse.json(
                { status: 409, errorCode: DRAFT_REVISION_STALE_ERROR_CODE, title: 'Conflict' },
                { status: 409, headers: { 'Content-Type': 'application/problem+json' } },
            ),
        ),
    ];
}

// Saving fails for good.
export function failingSaveHandlers(draft: SampleDraftDto = sampleDraftDto()) {
    return [
        http.get('*/api/invitation-drafts/:id', () => HttpResponse.json(draft)),
        http.put('*/api/invitation-drafts/:id', () => HttpResponse.json({ status: 400, errorCode: 'BAD_REQUEST' }, { status: 400 })),
    ];
}
