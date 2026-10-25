import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type WeddingSectionHeadProps = {
    // An intro under the heading.
    children?: ReactNode;
    // Width and bottom spacing.
    className?: string;
    heading: [string, string];
    // Size, line height and tracking of the heading.
    headingClassName: string;
    // The heading's id, for the section's aria-labelledby.
    id: string;
    kicker: string;
    // The kicker's color; coral unless given.
    kickerClassName?: string;
    // false: the bold part runs on after the first instead of starting a new line.
    stacked?: boolean;
};

// A centered section head: a small kicker, a heading whose second part is bold, and an optional intro.
export function WeddingSectionHead({
    children,
    className,
    heading,
    headingClassName,
    id,
    kicker,
    kickerClassName = 'text-[#ff765f]',
    stacked = true,
}: WeddingSectionHeadProps) {
    return (
        <div className={cn('mx-auto text-center', className)}>
            <p className={cn('mt-0 mb-4.5 text-[11px] font-extrabold tracking-[0.16em] uppercase', kickerClassName)}>{kicker}</p>
            <h2 className={cn('m-0 [font-family:var(--editorial)] font-normal', headingClassName)} id={id}>
                {heading[0]} {stacked ? <br /> : null}
                <strong className="font-bold">{heading[1]}</strong>
            </h2>
            {children}
        </div>
    );
}
