import { type InvitationDocument, upgradeInvitationDocument } from '@/lib/invitation/document';
import type { MediaResolver } from '@/lib/invitation/render';
import { type ThemeDesign, themeDesignSchema } from '@/lib/invitation/theme';

// What GET /api/invitation-themes/{slug} sends (guestwall-be InvitationThemePublicDto): an active
// theme's design and the invitation a host starts from.
export type InvitationThemePublicDto = {
    slug: string;
    name: string;
    eventType: string;
    design: unknown;
    document: unknown;
    // Image id to URL for every image the design and document use. The URLs may expire.
    assetUrls: Record<string, string>;
};

export type ThemePreview = { document: InvitationDocument; theme: ThemeDesign; media: MediaResolver };

// The backend's slug rule (InvitationThemeRequestDto).
const THEME_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const THEME_SLUG_MAX = 120;

export function invitationThemeEndpoint(slug: string): string {
    return `/api/invitation-themes/${encodeURIComponent(slug)}`;
}

// The theme a preview link names (?theme=<slug>): undefined without one, null when it can't be a slug.
export function previewThemeSlug(params: { theme?: string | string[] }): string | null | undefined {
    const { theme } = params;
    if (theme === undefined) return undefined;
    if (typeof theme !== 'string' || theme.length > THEME_SLUG_MAX || !THEME_SLUG.test(theme)) return null;
    return theme;
}

// Throws when the theme isn't in the format the renderer draws.
export function readThemePreview(dto: InvitationThemePublicDto): ThemePreview {
    const assetUrls = dto.assetUrls ?? {};
    return {
        document: upgradeInvitationDocument(dto.document),
        theme: themeDesignSchema.parse(dto.design),
        media: (mediaId) => assetUrls[mediaId],
    };
}
