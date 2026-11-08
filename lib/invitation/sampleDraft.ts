import type { InvitationDocument } from '@/lib/invitation/document';
import type { InvitationDraftDto } from '@/lib/invitation/drafts';
import { PREVIEW_THEME, previewDocument } from '@/lib/saveMyDatePreview';

// The staging preview's invitation, made valid: the format only takes full links,
// and the backend checks every saved draft against it.
export function sampleDraftDocument(): InvitationDocument {
    const document = previewDocument();
    return {
        ...document,
        sections: document.sections.map((section) =>
            section.type === 'contact' ? { ...section, data: { ...section.data, instagram: 'https://instagram.com/example' } } : section,
        ),
    };
}

// A draft whose document is known to be in the format.
export type SampleDraftDto = Omit<InvitationDraftDto, 'document'> & { document: InvitationDocument };

// A draft as the backend sends it. Tests and stories share it. Its images come from public/images.
export function sampleDraftDto(overrides: Partial<SampleDraftDto> = {}): SampleDraftDto {
    return {
        id: 'draft-1',
        themeSlug: 'olive',
        themeName: 'Olive',
        eventType: 'WEDDING',
        themeRevision: 3,
        eventId: null,
        revision: 4,
        document: sampleDraftDocument(),
        design: PREVIEW_THEME,
        imageUrls: {
            'm-top': '/images/venue.png',
            'm-main-art': '/images/couple-hero.png',
            'm-icon': '/images/post-florals.png',
            'm-leaf': '/images/post-florals.png',
            'm-g1': '/images/couple-hero.png',
            'm-1': '/images/post-flowers.png',
            'm-2': '/images/post-cake.png',
            'm-photo': '/images/venue.png',
        },
        expiresAt: null,
        updatedAt: '2026-06-15T12:00:00Z',
        token: null,
        ...overrides,
    };
}
