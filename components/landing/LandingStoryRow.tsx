import Image from 'next/image';

import { LandingStoryCopy, type LandingTextSegment } from '@/components/landing/LandingStoryCopy';
import { LandingStoryGallery } from '@/components/landing/LandingStoryGallery';
import { type LandingStoryMedia } from '@/lib/landingMedia';

export type LandingStoryCopyData = {
    galleryLabel: string;
    imageAlts: string[];
    imageLabels: string[];
    paragraphSegments: LandingTextSegment[][];
    tag: string;
    titleSegments: LandingTextSegment[];
};

type LandingStoryRowProps = {
    copy: LandingStoryCopyData;
    index: number;
    media: LandingStoryMedia;
};

export function LandingStoryRow({ copy, index, media }: LandingStoryRowProps) {
    return (
        <article className={`story-row${index === 0 ? ' active' : ''}`} data-row={index} tabIndex={0}>
            <div className="mobile-photo-wrap has-wedding-accordion">
                <Image alt={copy.imageAlts[0]} unoptimized {...media.main} />
                <LandingStoryGallery
                    alts={copy.imageAlts}
                    ariaLabel={copy.galleryLabel}
                    imageLabels={copy.imageLabels}
                    images={media.gallery}
                    rowIndex={index}
                />
            </div>
            <LandingStoryCopy paragraphSegments={copy.paragraphSegments} tag={copy.tag} titleSegments={copy.titleSegments} />
            <div className="arr">↗</div>
        </article>
    );
}
