import { vendorPageTypeForSlug } from '@/i18n/publicLocale';
import { getVendorPageOgCopy } from '@/lib/forBusinessMetadata';
import { forBusinessOgImage } from '@/lib/og/ogImages';
import { OG_IMAGE_SIZE } from '@/lib/seo';
import { showsUnreleasedPages } from '@/lib/unreleasedPages';

export const alt = 'StoryWall για επαγγελματίες γάμου και βάπτισης';
export const size = OG_IMAGE_SIZE;
export const contentType = 'image/png';

export default async function OpenGraphImage({ params }: { params: Promise<{ slug: string; vendorType: string }> }) {
    const { slug, vendorType } = await params;
    const type = slug === 'el' ? vendorPageTypeForSlug(vendorType, 'el') : null;
    if (!type || !showsUnreleasedPages()) return new Response(null, { status: 404 });
    return forBusinessOgImage(await getVendorPageOgCopy(type, 'el'));
}
