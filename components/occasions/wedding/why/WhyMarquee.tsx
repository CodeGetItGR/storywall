'use client';

import { motion } from 'framer-motion';

import { ProtectedImage } from '@/components/common/ProtectedImage';
import { MockPhoto } from '@/components/occasions/wedding/mock/MockPhoto';
import { useMarqueeMotion } from '@/hooks/useMarqueeMotion';
import type { OccasionPhoto } from '@/lib/occasions/occasionMedia';
import type { WeddingMarqueeCopy } from '@/lib/occasions/weddingCopy';
import { cn } from '@/lib/utils';

// One copy of the tiles crosses the screen in this many seconds.
const MARQUEE_SECONDS = 48;

export type WhyMarqueeTile = WeddingMarqueeCopy & { alt: string; avatar: OccasionPhoto; photo: OccasionPhoto };

// One copy of the tiles. The copy that only closes the loop is hidden from assistive tech.
function Tiles({ hidden = false, tiles }: { hidden?: boolean; tiles: WhyMarqueeTile[] }) {
    return (
        <div aria-hidden={hidden || undefined} className="flex gap-4 pr-4">
            {tiles.map((tile) => (
                <div
                    className="relative h-[clamp(228px,67vw,275px)] w-[clamp(168px,52vw,210px)] flex-none overflow-hidden rounded-3xl even:mt-7.5 min-[601px]:h-60 min-[601px]:w-45 min-[861px]:h-75 min-[861px]:w-57.5"
                    key={tile.photo.src}
                >
                    <ProtectedImage
                        alt={hidden ? '' : tile.alt}
                        className="size-full object-cover"
                        height={tile.photo.height}
                        loading="lazy"
                        sizes="(min-width: 861px) 230px, (min-width: 601px) 180px, 52vw"
                        src={tile.photo.src}
                        width={tile.photo.width}
                    />
                    {/* Who posted it; the photo's name already says it */}
                    <div
                        aria-hidden="true"
                        className="absolute inset-x-2.5 bottom-2.5 flex items-center gap-2 rounded-full bg-white/94 py-1.5 pr-3 pl-1.5 text-[12px]"
                    >
                        <MockPhoto className="size-7 flex-none rounded-full" photo={tile.avatar} sizes="28px" />
                        <span className="truncate">
                            <b>{tile.name}</b> · {tile.role}
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
}

// The guests' photos sliding past, paused on hover. For reduced motion or the landing's pause it
// stands still as one copy the user can scroll sideways.
export function WhyMarquee({ tiles }: { tiles: WhyMarqueeTile[] }) {
    const { still, x, onPointerEnter, onPointerLeave } = useMarqueeMotion(MARQUEE_SECONDS);

    return (
        <div
            className={cn('mt-6 pl-2', still ? 'overflow-x-auto' : 'overflow-hidden')}
            onPointerEnter={onPointerEnter}
            onPointerLeave={onPointerLeave}
        >
            <motion.div className="flex w-max pb-7.5" style={{ x }}>
                <Tiles tiles={tiles} />
                {still ? null : <Tiles hidden tiles={tiles} />}
            </motion.div>
        </div>
    );
}
