import Image from 'next/image';

import { type LandingImageAsset } from '@/lib/landingMedia';

const PANEL_IMAGE_OBJECT_POSITION = ['50%_45%', '50%_42%', '50%_47%', '50%_45%', '50%_50%'];

type LandingStoryGalleryProps = {
    alts: string[];
    ariaLabel: string;
    imageLabels: string[];
    images: LandingImageAsset[];
    rowIndex: number;
};

export function LandingStoryGallery({ alts, ariaLabel, imageLabels, images, rowIndex }: LandingStoryGalleryProps) {
    return (
        <div
            aria-label={ariaLabel}
            className="sw-wedding-accordion absolute inset-0 z-4 flex size-full bg-[#111]"
            data-story-accordion={rowIndex}
        >
            {images.map((image, index) => (
                <button
                    aria-label={imageLabels[index]}
                    aria-pressed={index === 0}
                    className="sw-wedding-panel group relative isolate h-full min-w-12 shrink grow-[0.72] basis-0 cursor-pointer appearance-none overflow-hidden border-0 bg-[#111] p-0 transition-[flex-grow] duration-[800ms] ease-[cubic-bezier(0.2,0.78,0.18,1)] aria-pressed:grow-[5.25] max-[760px]:min-w-9 max-[760px]:grow-[0.52] max-[760px]:aria-pressed:grow-[4.2] first:aria-pressed:[&.sw-panel-hint]:animate-[sw-panel-peek-desktop_2.65s_cubic-bezier(0.22,0.75,0.2,1)_1] max-[760px]:first:aria-pressed:[&.sw-panel-hint]:animate-[sw-panel-peek-mobile_2.45s_cubic-bezier(0.22,0.75,0.2,1)_1]"
                    data-panel-index={index}
                    key={image.src}
                    type="button"
                >
                    <Image
                        alt={alts[index]}
                        className={`absolute inset-[-2%] h-[104%] w-[104%] scale-[1.045] object-cover object-[${PANEL_IMAGE_OBJECT_POSITION[index % PANEL_IMAGE_OBJECT_POSITION.length]}] grayscale contrast-[0.96] brightness-[0.82] transition-[filter,transform] duration-[650ms] ease-[cubic-bezier(0.2,0.78,0.18,1)] group-aria-pressed:grayscale-0 group-aria-pressed:contrast-100 group-aria-pressed:brightness-100 group-first:group-aria-pressed:animate-[sw-wedding-first-hint_4.8s_ease-in-out_infinite_alternate] max-[760px]:scale-[1.09]`}
                        decoding="async"
                        loading={index === 0 ? 'eager' : 'lazy'}
                        unoptimized
                        {...image}
                    />
                    <span
                        aria-hidden="true"
                        className="sw-wedding-plus pointer-events-none absolute top-[17px] right-[17px] z-3 grid size-[30px] place-items-center rounded-full border border-white/78 bg-[rgba(17,17,17,0.3)] text-[21px] leading-none text-white backdrop-blur-[6px] transition-[transform,background-color,color] duration-[400ms] ease-in group-aria-pressed:rotate-45 group-aria-pressed:bg-white/88 group-aria-pressed:text-[#111] max-[760px]:top-2 max-[760px]:right-2 max-[760px]:size-[25px] max-[760px]:text-[17px]"
                    >
                        +
                    </span>
                </button>
            ))}
        </div>
    );
}
