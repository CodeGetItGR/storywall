import { publishedInvitationShareImage } from '@/lib/invitation/serverInvitationShare';
import { showsSaveMyDate } from '@/lib/saveMyDateRelease';

type ShareImageContext = { params: Promise<{ slug: string }> };

// `/save-my-date/i/<slug>/share-image`: the invitation's link preview picture, at a link that never
// expires. Next's opengraph-image file would give it a generated suffix; the page's metadata names this one.
export async function GET(_request: Request, { params }: ShareImageContext) {
    if (!showsSaveMyDate()) return new Response(null, { status: 404 });
    const { slug } = await params;
    return publishedInvitationShareImage(slug);
}
