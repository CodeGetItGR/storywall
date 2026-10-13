import { getForBusinessOgCopy } from '@/lib/forBusinessMetadata';
import { forBusinessOgImage } from '@/lib/og/ogImages';
import { OG_IMAGE_SIZE } from '@/lib/seo';

export const alt = 'StoryWall για επαγγελματίες γάμου και βάπτισης';
export const size = OG_IMAGE_SIZE;
export const contentType = 'image/png';

export default async function OpenGraphImage() {
    return forBusinessOgImage(await getForBusinessOgCopy('el'));
}
