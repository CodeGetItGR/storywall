import { type ReactNode, useId } from 'react';

import { cn } from '@/lib/utils';

type LitePlansSectionProps = {
    // "Only photos or wishes?" and the line under it.
    heading: string;
    intro: string;
    // The lite plan cards.
    children: ReactNode;
    className?: string;
};

// The lite plans under the full ones: a small heading, one line and the cards, always shown.
export function LitePlansSection({ heading, intro, children, className }: LitePlansSectionProps) {
    const headingId = useId();

    return (
        <section aria-labelledby={headingId} className={cn('flex flex-col', className)}>
            {/* Heading */}
            <div className="mx-auto max-w-155 text-center">
                <h3
                    className="font-[Baskerville,Georgia,serif] text-[clamp(30px,7vw,40px)] leading-[1.05] tracking-[-.04em] text-balance"
                    id={headingId}
                >
                    {heading}
                </h3>
                <p className="mt-2.5 text-[15px] leading-relaxed">{intro}</p>
            </div>

            {/* Lite plans */}
            <div className="mt-7 w-full min-[761px]:mt-9">{children}</div>
        </section>
    );
}
