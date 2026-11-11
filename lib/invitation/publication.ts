import { ApiError } from '@/lib/api/client';
import { isInvitationSlug } from '@/lib/invitation/inviteHost';

// A published copy of a draft, as POST /publish and GET /publication answer (guestwall-be PublicationDto).
export type InvitationPublicationDto = {
    draftId: string;
    slug: string;
    draftRevision: number;
    themeRevision: number;
    publishedAt: string;
    updatedAt: string;
    onlineUntil: string | null;
    online: boolean;
};

// GET /api/invitation-slugs/availability.
export type SlugAvailabilityDto = {
    slug: string;
    available: boolean;
    reason: 'INVALID' | 'RESERVED' | 'TAKEN' | null;
};

export const invitationPublicationKeys = {
    all: ['invitationPublications'] as const,
    detail: (draftId: string) => [...invitationPublicationKeys.all, draftId] as const,
    slug: (slug: string) => ['invitationSlugs', slug] as const,
};

// The backend's publish refusals (docs/fe-guides/invitation-drafts-fe-integration.md in guestwall-be).
export const PUBLISH_ERROR_CODES = {
    planMissing: 5012,
    noEvent: 5216,
    coverageEnded: 5217,
    slugTaken: 5218,
    slugNotAllowed: 5219,
} as const;

// What the editor does after a refused publish.
export type PublishFailure =
    // The event's plan has no Save my date: offer the plan.
    | 'plan-missing'
    // The event's coverage ended: offer the plan too.
    | 'coverage-ended'
    // The draft isn't on an event.
    | 'no-event'
    // The link field says why.
    | 'slug-taken'
    | 'slug-not-allowed'
    // Anything else: try again.
    | 'failed';

export function readPublishFailure(error: unknown): PublishFailure {
    if (!(error instanceof ApiError)) return 'failed';
    switch (Number(error.problem?.errorCode)) {
        case PUBLISH_ERROR_CODES.planMissing:
            return 'plan-missing';
        case PUBLISH_ERROR_CODES.coverageEnded:
            return 'coverage-ended';
        case PUBLISH_ERROR_CODES.noEvent:
            return 'no-event';
        case PUBLISH_ERROR_CODES.slugTaken:
            return 'slug-taken';
        case PUBLISH_ERROR_CODES.slugNotAllowed:
            return 'slug-not-allowed';
        default:
            return 'failed';
    }
}

// The link as the backend stores it: trimmed and lowercased.
export function normalizeSlug(value: string): string {
    return value.trim().toLowerCase();
}

// What the link field shows under the input.
export type SlugCheck = 'empty' | 'invalid' | 'checking' | 'available' | 'taken' | 'reserved' | 'unknown';

// The field's state from the typed link and the backend's answer for it, when there is one.
export function slugCheck(slug: string, answer: SlugAvailabilityDto | undefined, { failed }: { failed: boolean }): SlugCheck {
    if (!slug) return 'empty';
    if (!isInvitationSlug(slug)) return 'invalid';
    if (failed) return 'unknown';
    if (!answer || answer.slug !== slug) return 'checking';
    if (answer.available) return 'available';
    if (answer.reason === 'TAKEN') return 'taken';
    if (answer.reason === 'RESERVED') return 'reserved';
    return 'invalid';
}

// The publish button waits for a link the backend took. A failed check doesn't block it: the publish checks again.
export function canPublishSlug(check: SlugCheck): boolean {
    return check === 'available' || check === 'unknown';
}

// The host guests open: invite. in front of the site's host, without www.
export function inviteHostFor(siteUrl: string): string {
    const host = new URL(siteUrl).host.replace(/^www\./, '');
    return `invite.${host}`;
}
