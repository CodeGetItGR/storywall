import type { ReactElement } from 'react';

import { ArtTile } from '@/components/vendors/me/VendorToolArt';

export type VendorArt = { Art: () => ReactElement; wash: string };

// A drawing for a tool, perk or step. Beside the text on phones, and above it and a third larger from there up. Decoration only: the
// title next to it says what it is.
export function VendorPageArt({ art: { Art, wash } }: { art: VendorArt }) {
    return (
        <div className="size-18 shrink-0 min-[480px]:size-24">
            <div className="origin-top-left min-[480px]:scale-[1.3333]">
                <ArtTile wash={wash}>
                    <Art />
                </ArtTile>
            </div>
        </div>
    );
}
