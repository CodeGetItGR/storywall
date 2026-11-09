import '@/components/saveMyDate/editor/editor.css';

import type { Decorator } from '@storybook/nextjs-vite';
import { http, HttpResponse } from 'msw';

import { DRAFT_REVISION_STALE_ERROR_CODE, readEditableDraft } from '@/lib/invitation/drafts';
import { type SampleDraftDto, sampleDraftDto } from '@/lib/invitation/sampleDraft';

// The invitation editor's stories. The editor's parts read its dark colours from .smd-editor.

// A piece of the editor on its dark background.
export const withEditorChrome: Decorator = (Story) => (
    <div className="smd-editor bg-(--smd-editor-panel) p-4 text-(--smd-editor-text)">
        <Story />
    </div>
);

// The whole editor, as tall as the screen, the way the page lays it out.
export const withEditorScreen: Decorator = (Story) => (
    <div className="h-svh">
        <Story />
    </div>
);

export const storyDraft = () => readEditableDraft(sampleDraftDto());

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
