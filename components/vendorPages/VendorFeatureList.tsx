import type { ReactNode } from 'react';

import { type VendorArt, VendorPageArt } from '@/components/vendorPages/art/VendorPageArt';
import { FEATURE_LIST_BODY, FEATURE_TITLE } from '@/components/vendorPages/vendorPageStyles';
import { VendorRenderFrame } from '@/components/vendorPages/VendorRenderFrame';
import { cn } from '@/lib/utils';

export type VendorFeature = { key: string; art: VendorArt; title: string; body: string; render: ReactNode };

type VendorFeatureListProps = { features: VendorFeature[]; className?: string; bodyClassName?: string; frameClassName?: string };

// A list of features with a drawing, a title, a sentence and a framed render each. One in a row on phones, two on tablets, four on desktop. A shorter row sits in the middle.
const LAYOUT = {
    list: '',
    item: 'min-[761px]:w-[calc((100%-1rem)/2)] min-[1200px]:w-[calc((100%-3rem)/4)]',
    text: '',
    art: '',
    frame: '',
};

// Five items: the list narrows to fit three of the same width as four in a row would have, so the rest wrap to a second row of two.
const FIVE_LAYOUT = {
    ...LAYOUT,
    list: 'min-[1200px]:mx-auto min-[1200px]:max-w-[calc(75%-0.25rem)]',
    item: 'min-[761px]:w-[calc((100%-1rem)/2)] min-[1200px]:w-[calc((100%-2rem)/3)]',
};

// A single item: from tablets up, everything is centred with a wider text and a larger render.
const SINGLE_LAYOUT = {
    list: '',
    item: 'min-[761px]:w-full min-[761px]:max-w-xl',
    text: 'min-[761px]:flex min-[761px]:flex-col min-[761px]:items-center min-[761px]:gap-0 min-[761px]:text-center',
    art: 'min-[761px]:mx-auto',
    frame: 'min-[761px]:[--render-scale:0.85] min-[1200px]:[--render-scale:0.85] min-[1400px]:[--render-scale:0.85]',
};

function layoutFor(count: number) {
    if (count === 1) return SINGLE_LAYOUT;
    return count === 5 ? FIVE_LAYOUT : LAYOUT;
}

export function VendorFeatureList({ features, className, bodyClassName = 'text-[#151313]/75', frameClassName }: VendorFeatureListProps) {
    const layout = layoutFor(features.length);

    return (
        <ul className={cn('m-0 flex list-none flex-wrap justify-center gap-x-4 gap-y-10 p-0 min-[761px]:gap-y-14', layout.list, className)}>
            {features.map(({ key, art, title, body, render }) => (
                <li key={key} className={cn('flex w-full max-w-90 min-w-0 flex-col gap-5', layout.item)}>
                    {/* Drawing and text */}
                    <div className={cn('flex min-w-0 gap-4 min-[480px]:block', layout.text)}>
                        <VendorPageArt art={art} className={layout.art} />
                        <div className="min-w-0">
                            <h3 className={FEATURE_TITLE}>{title}</h3>
                            <p className={cn(FEATURE_LIST_BODY, bodyClassName)}>{body}</p>
                        </div>
                    </div>
                    {/* Render, level across the row whatever the text length */}
                    <VendorRenderFrame className={cn('mx-auto mt-auto', layout.frame, frameClassName)}>{render}</VendorRenderFrame>
                </li>
            ))}
        </ul>
    );
}
