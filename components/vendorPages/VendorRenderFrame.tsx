import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

// How much a phone screen is shrunk to fit the frame. Smaller where four in a row have the least room.
const RENDER_SCALE = '[--render-scale:0.6556] min-[1200px]:[--render-scale:0.5667] min-[1400px]:[--render-scale:0.6556]';

type VendorRenderFrameProps = { children: ReactNode; className?: string };

// A bordered frame around a bare render of a screen. The screen is laid out at phone size, then shrunk as a whole, so it looks the same at every width. Tall content is cropped at
// the bottom edge. Inert, so nothing in it takes focus or reaches screen readers: the sample content adds nothing to the text next to it.
export function VendorRenderFrame({ children, className }: VendorRenderFrameProps) {
    return (
        <div className={cn('w-fit rounded-[36px] border border-[#151313]/14 bg-white/55 p-1.5 shadow-[0_18px_40px_-24px_rgba(90,50,40,0.35)]', RENDER_SCALE, className)}>
            <div className="h-[calc(640px*var(--render-scale))] w-[calc(360px*var(--render-scale))] overflow-hidden rounded-[30px] bg-white text-left text-ink" inert>
                <div className="h-160 w-90 origin-top-left scale-(--render-scale)">{children}</div>
            </div>
        </div>
    );
}
