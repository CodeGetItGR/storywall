import { serverPublicGetOrNull } from '@/lib/api/serverFetch';
import {
    invitationThemeEndpoint,
    type InvitationThemePublicDto,
    previewThemeSlug,
    readThemePreview,
    type ThemePreview,
} from '@/lib/invitation/themePreview';
import { PREVIEW_THEME, previewDateOptions, previewDocument, previewMedia } from '@/lib/saveMyDatePreview';

export type PreviewParams = { date?: string | string[]; lang?: string | string[]; theme?: string | string[] };

// Server-only: an active theme from the catalogue, or null when no active theme has this slug.
// Never cached, because the image URLs may expire. Throws when the backend fails.
export async function fetchThemePreview(slug: string): Promise<ThemePreview | null> {
    const dto = await serverPublicGetOrNull<InvitationThemePublicDto>(invitationThemeEndpoint(slug));
    return dto && readThemePreview(dto);
}

// What the staging preview draws: the theme ?theme=<slug> names, or else the made-up sample, whose
// date layout and language ?date= and ?lang= pick. Null for a theme that isn't there.
export async function loadPreviewInvitation(params: PreviewParams): Promise<ThemePreview | null> {
    const slug = previewThemeSlug(params);
    if (slug === null) return null;
    if (slug) return fetchThemePreview(slug);
    const { style, lang } = previewDateOptions(params);
    return { document: previewDocument(style, lang), theme: PREVIEW_THEME, media: previewMedia };
}
