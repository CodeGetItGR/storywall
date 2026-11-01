import { qrWeddingOgImage } from '@/lib/og/ogImages';
import { getQrWeddingOgCopy } from '@/lib/qrWeddingMetadata';
import { OG_IMAGE_SIZE } from '@/lib/seo';
import { showsUnreleasedPages } from '@/lib/unreleasedPages';

export const alt = 'Καλεσμένη σκανάρει το QR code του StoryWall στο τραπέζι του γάμου';
export const size = OG_IMAGE_SIZE;
export const contentType = 'image/jpeg';

// Only the Greek page lives here; any other slug has no image.
export default async function OpenGraphImage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    if (slug !== 'el' || !showsUnreleasedPages()) return new Response(null, { status: 404 });
    return qrWeddingOgImage(await getQrWeddingOgCopy('el'));
}
