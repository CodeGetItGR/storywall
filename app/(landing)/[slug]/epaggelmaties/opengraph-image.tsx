import { getForBusinessOgCopy } from '@/lib/forBusinessMetadata';
import { forBusinessOgImage } from '@/lib/og/ogImages';
import { OG_IMAGE_SIZE } from '@/lib/seo';
import { showsUnreleasedPages } from '@/lib/unreleasedPages';

export const alt = 'StoryWall για επαγγελματίες γάμου και βάπτισης';
export const size = OG_IMAGE_SIZE;
export const contentType = 'image/png';

export default async function OpenGraphImage() {
    if (!showsUnreleasedPages()) return new Response(null, { status: 404 });
    return forBusinessOgImage(await getForBusinessOgCopy('el'));
}
