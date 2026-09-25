import { brandOgImage } from '@/lib/og/ogImages';
import { OG_IMAGE_SIZE } from '@/lib/seo';

// Rendered once at build time and served at /opengraph-image for every locale.
// Copy stays in English on purpose — the artwork is the same in both languages.
export const alt = 'StoryWall — the social space for every private event';
export const size = OG_IMAGE_SIZE;
export const contentType = 'image/png';

export default function OpenGraphImage() {
    return brandOgImage();
}
