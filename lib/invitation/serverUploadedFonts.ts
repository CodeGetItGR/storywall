import { serverPublicCachedGet } from '@/lib/api/serverFetch';
import type { InvitationFontDto } from '@/lib/invitation/uploadedFonts';

const REVALIDATE_SECONDS = 300;

// Server-only: the catalogue fonts for drawing invitations. The same for every visitor, so cached
// (see serverPublicCachedGet). On failure the text falls back to its plain font; the page still works.
export async function fetchUploadedFonts(): Promise<InvitationFontDto[]> {
    try {
        return await serverPublicCachedGet<InvitationFontDto[]>('/api/invitation-fonts/files', REVALIDATE_SECONDS);
    } catch {
        return [];
    }
}
