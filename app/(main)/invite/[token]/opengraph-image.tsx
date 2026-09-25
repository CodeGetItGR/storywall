import { eventOgImage } from '@/lib/og/ogImages';
import { OG_IMAGE_SIZE } from '@/lib/seo';
import { getInviteShareEvent } from '@/lib/shareMetadata';

export const alt = 'StoryWall';
export const size = OG_IMAGE_SIZE;
export const contentType = 'image/jpeg';

type ImageProps = { params: Promise<{ token: string }> };

export default async function OpenGraphImage({ params }: ImageProps) {
    return eventOgImage(await getInviteShareEvent((await params).token));
}
