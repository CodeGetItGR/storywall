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
    const isOdd = index % 2 === 0;
    const wide = index === 0 || index === 4;

    return (
        <article
            className={`story-row group grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-3.5 border-b border-(--line) py-6.5 pb-8.5 opacity-100 outline-none [grid-template-areas:'photo_photo'_'copy_arr'] focus-visible:ring-2 focus-visible:ring-(--coral) focus-visible:ring-inset min-[761px]:items-center min-[761px]:gap-x-[clamp(20px,2.5vw,44px)] min-[761px]:gap-y-0 min-[761px]:border-b-0 min-[761px]:py-[clamp(42px,5vw,78px)] min-[761px]:opacity-[0.36] min-[761px]:transition-opacity min-[761px]:duration-300 min-[761px]:[grid-template-areas:unset] min-[761px]:data-[active=true]:opacity-100 ${
                isOdd
                    ? 'min-[761px]:pr-[clamp(22px,4vw,72px)] min-[761px]:pl-0 min-[761px]:grid-cols-[minmax(0,1.08fr)_54px_minmax(0,0.92fr)_34px]'
                    : 'min-[761px]:pr-0 min-[761px]:pl-[clamp(22px,4vw,72px)] min-[761px]:grid-cols-[54px_minmax(0,0.92fr)_34px_minmax(0,1.08fr)]'
            }`}
            data-row={index}
            tabIndex={0}
        >
            <div
                className={`mobile-photo-wrap relative mb-4 block h-[60vw] max-h-102.5 min-h-57.5 w-[calc(100vw-40px)] max-w-[calc(100vw-40px)] overflow-hidden bg-[#111] opacity-0 transition-[clip-path,transform,opacity] duration-1050 ease-[cubic-bezier(0.18,0.8,0.2,1)] will-change-transform [grid-area:photo] min-[761px]:m-0 min-[761px]:h-[62.4vh] min-[761px]:max-h-none min-[761px]:min-h-0 min-[761px]:w-full min-[761px]:max-w-none min-[761px]:opacity-100 min-[761px]:[clip-path:none]! min-[761px]:translate-x-0! min-[761px]:row-1 ${
                    isOdd
                        ? "-ml-5 mr-auto max-[760px]:rounded-br-[38px] max-[760px]:[clip-path:inset(0_38%_0_0)] max-[760px]:translate-x-[-34vw] max-[760px]:group-data-[visible=true]:[clip-path:inset(0_0_0_0)] max-[760px]:group-data-[visible=true]:translate-x-0 max-[760px]:group-data-[visible=true]:opacity-100 min-[761px]:rounded-br-[42px] min-[761px]:col-1"
                        : "ml-auto -mr-5 max-[760px]:rounded-bl-[38px] max-[760px]:[clip-path:inset(0_0_0_38%)] max-[760px]:translate-x-[34vw] max-[760px]:group-data-[visible=true]:[clip-path:inset(0_0_0_0)] max-[760px]:group-data-[visible=true]:translate-x-0 max-[760px]:group-data-[visible=true]:opacity-100 min-[761px]:rounded-bl-[42px] min-[761px]:col-4"
                }`}
            >
                <LandingStoryGallery
                    alts={copy.imageAlts}
                    ariaLabel={copy.galleryLabel}
                    imageLabels={copy.imageLabels}
                    images={media.gallery}
                    rowIndex={index}
                />
            </div>
            <div
                className={`flex justify-between px-5 [grid-area:copy] max-[760px]:translate-y-4.5 max-[760px]:opacity-0 max-[760px]:transition-[opacity,transform] max-[760px]:duration-700 max-[760px]:ease-[cubic-bezier(0.2,0.75,0.2,1)] max-[760px]:group-data-[visible=true]:translate-y-0 max-[760px]:group-data-[visible=true]:opacity-100 max-[760px]:group-data-[visible=true]:delay-[120ms] min-[761px]:row-1 ${isOdd ? 'min-[761px]:col-3' : 'min-[761px]:col-2'}`}
            >
                <LandingStoryCopy paragraphSegments={copy.paragraphSegments} tag={copy.tag} titleSegments={copy.titleSegments} wide={wide} />
            <div
                className={`arr mt-8 self-start justify-self-end text-[26px] leading-none text-ink transition-[opacity,transform] duration-350 ease-in-out [grid-area:arr] group-data-[active=true]:-translate-y-1 group-data-[active=true]:translate-x-1 max-[760px]:translate-y-4.5 max-[760px]:opacity-0 max-[760px]:duration-700 max-[760px]:ease-[cubic-bezier(0.2,0.75,0.2,1)] max-[760px]:group-data-[visible=true]:translate-y-0 max-[760px]:group-data-[visible=true]:opacity-100 max-[760px]:group-data-[visible=true]:delay-[180ms] min-[761px]:mt-0 min-[761px]:self-start min-[761px]:pt-2 min-[761px]:text-[30px] min-[761px]:row-1 ${
                    isOdd ? 'min-[761px]:col-4' : 'min-[761px]:col-3'
                }`}
            >
                ↗
            </div>
            </div>
        </article>
    );
}
