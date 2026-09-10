import Image from 'next/image';

import { type LandingImageAsset } from '@/lib/landingMedia';

type LandingStoryGalleryProps = {
    alts: string[];
    ariaLabel: string;
    imageLabels: string[];
    images: LandingImageAsset[];
    rowIndex: number;
};

export function LandingStoryGallery({ alts, ariaLabel, imageLabels, images, rowIndex }: LandingStoryGalleryProps) {
    return (
        <div aria-label={ariaLabel} className="sw-wedding-accordion sw-wedding-accordion-mobile is-visible" data-story-accordion={rowIndex}>
            {images.map((image, index) => (
                <button
                    aria-label={imageLabels[index]}
                    aria-pressed={index === 0}
                    className={`sw-wedding-panel${index === 0 ? ' is-active' : ''}`}
                    data-panel-index={index}
                    key={image.src}
                    type="button"
                >
                    <Image alt={alts[index]} decoding="async" loading={index === 0 ? 'eager' : 'lazy'} unoptimized {...image} />
                    <span aria-hidden="true" className="sw-wedding-plus">
                        +
                    </span>
                </button>
            ))}
        </div>
    );
}
