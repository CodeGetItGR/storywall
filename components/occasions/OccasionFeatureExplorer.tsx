'use client';

import { Mail } from 'lucide-react';
import Image from 'next/image';

import { useOccasionFeatureExplorer } from '@/hooks/useOccasionFeatureExplorer';
import type { OccasionFeatureImage } from '@/lib/occasions/occasionMedia';
import { getModuleIcon } from '@/lib/planModules';
import { cn } from '@/lib/utils';

export type OccasionFeatureItem = { key: string; title: string; body: string; image: OccasionFeatureImage };

function FeatureImage({ image, sizes }: { image: OccasionFeatureImage; sizes: string }) {
    return (
        <Image
            fill
            alt=""
            className={cn('object-cover', image.position === 'top' && 'object-top', image.position === 'bottom' && 'object-bottom')}
            sizes={sizes}
            src={image.src}
        />
    );
}

// Phones: one swipeable card per feature. Desktop: the list beside one large image that follows the selection.
export function OccasionFeatureExplorer({ features }: { features: OccasionFeatureItem[] }) {
    const { activeKey, pick } = useOccasionFeatureExplorer(features.map((feature) => feature.key));

    return (
        <div className="mt-8 min-[761px]:mt-12 min-[1024px]:grid min-[1024px]:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] min-[1024px]:items-start min-[1024px]:gap-[5vw]">
            {/* Features */}
            <ul className="no-scrollbar -mx-5 flex snap-x snap-mandatory scroll-px-5 list-none gap-4 overflow-x-auto px-5 pb-4 min-[761px]:-mx-[5vw] min-[761px]:scroll-px-[5vw] min-[761px]:px-[5vw] min-[1024px]:mx-0 min-[1024px]:flex-col min-[1024px]:gap-1 min-[1024px]:overflow-visible min-[1024px]:p-0">
                {features.map((feature) => {
                    const Icon = feature.key === 'invitation' ? Mail : getModuleIcon(feature.key);
                    const active = feature.key === activeKey;
                    return (
                        <li className="w-[78vw] max-w-80 shrink-0 snap-start min-[1024px]:w-auto min-[1024px]:max-w-none" key={feature.key}>
                            {/* Image (phones) */}
                            <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-white/6 min-[1024px]:hidden">
                                <FeatureImage image={feature.image} sizes="80vw" />
                            </div>
                            {/* Copy; on desktop it also picks the image */}
                            <button
                                aria-pressed={active}
                                className={cn(
                                    'mt-4 flex w-full cursor-default gap-4 rounded-2xl border-0 bg-transparent p-0 text-left text-inherit min-[1024px]:mt-0 min-[1024px]:cursor-pointer min-[1024px]:p-4 min-[1024px]:transition-colors',
                                    active ? 'min-[1024px]:bg-white/8' : 'min-[1024px]:hover:bg-white/4',
                                )}
                                data-feature-key={feature.key}
                                onClick={pick}
                                onFocus={pick}
                                onMouseEnter={pick}
                                type="button"
                            >
                                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[image:var(--occasion-gradient)] text-white">
                                    <Icon aria-hidden="true" className="size-4.5" />
                                </span>
                                <span>
                                    <span className="block text-base font-bold">{feature.title}</span>
                                    <span className="mt-1 block text-[15px] leading-[1.55] text-white/70">{feature.body}</span>
                                </span>
                            </button>
                        </li>
                    );
                })}
            </ul>

            {/* Image (desktop), follows the selected feature */}
            <div aria-hidden="true" className="relative hidden aspect-[4/5] overflow-hidden rounded-[28px] bg-white/6 min-[1024px]:sticky min-[1024px]:top-24 min-[1024px]:block">
                {features.map((feature) => (
                    <div
                        className={cn('absolute inset-0 transition-opacity duration-500', feature.key === activeKey ? 'opacity-100' : 'opacity-0')}
                        key={feature.key}
                    >
                        <FeatureImage image={feature.image} sizes="45vw" />
                    </div>
                ))}
            </div>
        </div>
    );
}
