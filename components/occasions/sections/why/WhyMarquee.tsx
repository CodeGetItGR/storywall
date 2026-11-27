'use client';

import { motion } from 'framer-motion';

import { WhyGuestTile, type WhyGuestTileData } from '@/components/occasions/sections/why/WhyGuestTile';
import { useMarqueeMotion } from '@/hooks/useMarqueeMotion';
import { cn } from '@/lib/utils';

// One copy of the tiles crosses the screen in this many seconds.
const MARQUEE_SECONDS = 48;

// One copy of the tiles. The copy that only closes the loop is hidden from assistive tech.
function Tiles({ hidden = false, tiles }: { hidden?: boolean; tiles: WhyGuestTileData[] }) {
    return (
        <div aria-hidden={hidden || undefined} className="flex gap-4 pr-4">
            {tiles.map((tile) => (
                <WhyGuestTile key={tile.photo.src} tile={tile} />
            ))}
        </div>
    );
}

// The guests' photos sliding past, paused on hover. For reduced motion or the landing's pause it
// stands still as one copy the user can scroll sideways.
export function WhyMarquee({ tiles }: { tiles: WhyGuestTileData[] }) {
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
