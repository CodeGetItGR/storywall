import { ProtectedImage } from '@/components/common/ProtectedImage';
import type { OccasionRsvpPictures } from '@/lib/occasions/pageMedia';

type RsvpPicturesProps = { alts: { both: string; with: string; without: string }; pictures: OccasionRsvpPictures };

// Replies without and with StoryWall: one wide picture from 761 px, the two halves stacked below.
export function RsvpPictures({ alts, pictures }: RsvpPicturesProps) {
    const { both, with: after, without } = pictures;

    return (
        <div className="self-start">
            {/* Both, side by side. Unoptimized so image search keeps its transparency: the optimizer turns it into a black-backed JPEG for crawlers. */}
            <ProtectedImage
                unoptimized
                alt={alts.both}
                className="hidden h-auto w-full min-[761px]:block"
                height={both.height}
                loading="lazy"
                src={both.src}
                width={both.width}
            />
            {/* Without, then with */}
            <div className="grid gap-6.5 min-[761px]:hidden">
                <ProtectedImage
                    alt={alts.without}
                    className="mx-auto h-auto w-[96%]"
                    height={without.height}
                    loading="lazy"
                    sizes="82vw"
                    src={without.src}
                    width={without.width}
                />
                <ProtectedImage
                    alt={alts.with}
                    className="h-auto w-full"
                    height={after.height}
                    loading="lazy"
                    sizes="85vw"
                    src={after.src}
                    width={after.width}
                />
            </div>
        </div>
    );
}
