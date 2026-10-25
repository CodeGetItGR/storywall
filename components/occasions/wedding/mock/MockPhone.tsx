import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type MockPhoneProps = {
    children: ReactNode;
    // The phone's width, place and tilt.
    className?: string;
};

// A phone drawn in Tailwind: gold bezel, dark rim, white screen. className places the phone and must
// give it a width. The root is a container, so the bezel is sized from the phone's own width (a %
// padding would follow the parent's); the screen is one too, so what it holds sizes itself in cqw
// and scales with the phone.
export function MockPhone({ children, className }: MockPhoneProps) {
    return (
        <div className={cn('[container-type:inline-size]', className)}>
            <div className="rounded-[14%/6.6%] bg-[linear-gradient(145deg,#f3dfc0_0%,#c9a47a_38%,#8f6a45_62%,#e8cfa6_100%)] p-[2.4cqw] shadow-[0_30px_50px_-24px_rgba(70,38,24,0.45)]">
                <div className="rounded-[12.5%/5.9%] bg-[#1d1a18] p-[1.6cqw]">
                    <div className="[container-type:inline-size] relative aspect-[9/19.5] overflow-hidden rounded-[11%/5.2%] bg-white text-[#151313]">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
