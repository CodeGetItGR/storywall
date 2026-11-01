import { qrWeddingOgImage } from '@/lib/og/ogImages';
import { getQrWeddingOgCopy } from '@/lib/qrWeddingMetadata';
import { OG_IMAGE_SIZE } from '@/lib/seo';
import { showsUnreleasedPages } from '@/lib/unreleasedPages';

export const alt = 'A guest scans the StoryWall QR code on a wedding table';
export const size = OG_IMAGE_SIZE;
export const contentType = 'image/jpeg';

export default async function OpenGraphImage() {
    if (!showsUnreleasedPages()) return new Response(null, { status: 404 });
    return qrWeddingOgImage(await getQrWeddingOgCopy('en'));
}
