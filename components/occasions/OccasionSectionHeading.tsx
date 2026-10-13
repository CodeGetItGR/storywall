import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type OccasionSectionHeadingProps = { children: ReactNode; className?: string; eyebrow?: string };

export function OccasionSectionHeading({ children, className, eyebrow }: OccasionSectionHeadingProps) {
    return (
        <div className={cn('occasion-reveal', className)}>
            {eyebrow ? <p className="occasion-label m-0 mb-3 text-xs font-black tracking-[0.18em] uppercase min-[761px]:text-[13px]">{eyebrow}</p> : null}
            <h2 className="m-0 max-w-[22ch] [font-family:var(--editorial)] text-[clamp(30px,8vw,40px)] leading-[1.05] font-normal tracking-[-0.03em] text-balance min-[761px]:text-[52px]">
                {children}
            </h2>
        </div>
    );
}
