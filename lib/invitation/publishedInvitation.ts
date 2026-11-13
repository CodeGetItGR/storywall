import { z } from 'zod';

import { type InvitationDocument, upgradeInvitationDocument } from '@/lib/invitation/document';
import { type InvitationEventData, resolveLinkedSections } from '@/lib/invitation/eventLinks';
import type { MediaResolver } from '@/lib/invitation/render';
import { type ThemeDesign, themeDesignSchema } from '@/lib/invitation/theme';

// What GET /api/public/invitations/{slug} sends (guestwall-be PublicInvitationDto): the published copy only.
export type PublicInvitationDto = {
    slug: string;
    eventType: string;
    themeName: string;
    themeRevision: number;
    design: unknown;
    document: unknown;
    // Image id to URL for every image the copy uses. The URLs expire, so the page is never cached.
    imageUrls: Record<string, string>;
    updatedAt: string;
    // What the invitation follows from its event (KAN-84). Missing from a backend older than it.
    event?: InvitationEventData | null;
};

// The event part of the read, checked before it is drawn. Extra fields from a newer backend are fine.
const nullableString = z.string().nullable();
const invitationEventDataSchema: z.ZodType<InvitationEventData> = z.object({
    eventType: z.string(),
    title: z.string(),
    timezone: z.string(),
    startAt: nullableString,
    rsvp: z.object({ deadline: nullableString }).nullable(),
    cover: z.object({ mediaId: z.string(), width: z.number().nullable(), height: z.number().nullable() }).nullable(),
    location: z.object({ name: nullableString, address: nullableString, mapsUrl: nullableString }),
    sessions: z
        .array(
            z.object({
                id: z.string(),
                title: z.string(),
                description: nullableString,
                startAt: nullableString,
                locationName: nullableString,
                mapsUrl: nullableString,
                displayOrder: z.number(),
                isMain: z.boolean(),
                isSecondary: z.boolean(),
            }),
        )
        .nullable(),
    joinUrl: nullableString,
});

// The event as the backend sent it, or null when it sent none or one the page can't read: then the page shows the
// published copy as it was saved.
export function readInvitationEventData(raw: unknown): InvitationEventData | null {
    const parsed = invitationEventDataSchema.safeParse(raw);
    return parsed.success ? parsed.data : null;
}

export type PublishedInvitation = {
    document: InvitationDocument;
    theme: ThemeDesign;
    media: MediaResolver;
    // The event's guest link, for the "Join the event" button.
    joinUrl?: string;
};

export type PublishedInvitationState =
    | { kind: 'found'; invitation: PublishedInvitation }
    // Never published, unpublished, or its event suspended or deleted.
    | { kind: 'not-found' }
    // The event's coverage ended or its plan dropped Save my date. Extending it brings the link back.
    | { kind: 'expired' }
    // The backend failed or sent something the renderer can't draw.
    | { kind: 'error' };

// The page's own copy, read on the server: this layout sends no messages to the browser.
export type PublishedInvitationLabels = {
    // The tab title of a live invitation.
    title: string;
    notFound: string;
    expired: string;
    loadFailed: string;
    retry: string;
};

// The tab title: the invitation, or the message shown in its place.
export function publishedInvitationTitle(state: PublishedInvitationState, labels: PublishedInvitationLabels): string {
    switch (state.kind) {
        case 'found':
            return labels.title;
        case 'not-found':
            return labels.notFound;
        case 'expired':
            return labels.expired;
        case 'error':
            return labels.loadFailed;
    }
}

export function publicInvitationEndpoint(slug: string): string {
    return `/api/public/invitations/${encodeURIComponent(slug)}`;
}

// A guest's RSVP reply from the published page (no account).
export function publicInvitationRsvpEndpoint(slug: string): string {
    return `${publicInvitationEndpoint(slug)}/rsvp`;
}

// Throws when the copy or theme isn't in the format the renderer draws. Linked sections show the event as it is now.
export function readPublishedInvitation(dto: PublicInvitationDto): PublishedInvitation {
    const imageUrls = dto.imageUrls ?? {};
    const event = readInvitationEventData(dto.event);
    return {
        document: resolveLinkedSections(upgradeInvitationDocument(dto.document), event),
        theme: themeDesignSchema.parse(dto.design),
        media: (mediaId) => imageUrls[mediaId],
        joinUrl: event?.joinUrl ?? undefined,
    };
}

// The backend answers 404 for a link that isn't live and 410 (5221) once it has expired.
export function publishedInvitationState(status: number, body: unknown): PublishedInvitationState {
    if (status === 404) return { kind: 'not-found' };
    if (status === 410) return { kind: 'expired' };
    if (status !== 200) return { kind: 'error' };
    try {
        return { kind: 'found', invitation: readPublishedInvitation(body as PublicInvitationDto) };
    } catch {
        return { kind: 'error' };
    }
}
