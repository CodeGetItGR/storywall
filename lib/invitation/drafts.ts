import { hashKey } from '@tanstack/react-query';

import { ApiError } from '@/lib/api/client';
import { type InvitationDocument, upgradeInvitationDocument } from '@/lib/invitation/document';
import type { MediaResolver } from '@/lib/invitation/render';
import { type ThemeDesign, themeDesignSchema } from '@/lib/invitation/theme';

// A draft as GET /api/invitation-drafts/{id} sends it (guestwall-be InvitationDraftDto).
export type InvitationDraftDto = {
    id: string;
    themeSlug: string;
    themeName: string;
    eventType: string;
    themeRevision: number;
    eventId: string | null;
    // Every save names the revision it was loaded or last saved at.
    revision: number;
    document: unknown;
    // The theme as it is now: drafts follow the theme live.
    design: unknown;
    // Image id to URL, for the images the design and document point at.
    imageUrls: Record<string, string>;
    expiresAt: string | null;
    updatedAt: string;
    token: string | null;
};

// What an autosave answers: the revision the next save must name.
export type InvitationDraftSavedDto = { id: string; revision: number; expiresAt: string | null; updatedAt: string };

// The backend's answer when a save names an older revision than the stored one.
export const DRAFT_REVISION_STALE_ERROR_CODE = 5208;

export const invitationDraftKeys = {
    all: ['invitationDrafts'] as const,
    detail: (draftId: string) => [...invitationDraftKeys.all, draftId] as const,
};

// A draft ready for the editor: the document and theme checked against the format.
export type EditableDraft = {
    id: string;
    revision: number;
    // The event type the theme is for: it decides which sections the host may add.
    eventType: string;
    // The event that pays for publishing; null until the draft is put on one.
    eventId: string | null;
    document: InvitationDocument;
    theme: ThemeDesign;
    media: MediaResolver;
};

// Throws when the stored document or theme isn't in the format the renderer draws.
export function readEditableDraft(dto: InvitationDraftDto): EditableDraft {
    const imageUrls = dto.imageUrls ?? {};
    return {
        id: dto.id,
        revision: dto.revision,
        eventType: dto.eventType,
        eventId: dto.eventId ?? null,
        document: upgradeInvitationDocument(dto.document),
        theme: themeDesignSchema.parse(dto.design),
        media: (mediaId) => imageUrls[mediaId],
    };
}

export function isStaleRevision(error: unknown): boolean {
    return error instanceof ApiError && error.status === 409 && error.problem?.errorCode === DRAFT_REVISION_STALE_ERROR_CODE;
}

// Worth trying again: no answer, a busy or failing server. A rejected save (4xx) is not.
export function isTransientSaveError(error: unknown): boolean {
    if (!(error instanceof ApiError)) return true;
    return error.status === 429 || error.status >= 500;
}

// The draft was deleted or is no longer theirs to edit: trying again won't help.
export function isLostDraftError(error: unknown): boolean {
    return error instanceof ApiError && (error.status === 403 || error.status === 404);
}

// The same content, whatever order the keys come back in (the database reorders them).
export function sameDocument(a: unknown, b: unknown): boolean {
    return hashKey([a]) === hashKey([b]);
}
