import type { ReactNode } from 'react';

import { HeroBackground } from '@/components/landing/HeroBackground';

type KeywordHeroProps = {
    actions: ReactNode;
    // The page's main search, as its only h1.
    h1: string;
    header: ReactNode;
    headline: ReactNode;
    lead: string;
    // A short line under the lead.
    note: string;
    visual: ReactNode;
};

// The hero of a page written for one search: occasion pages and the wedding QR page.
export function KeywordHero({ actions, h1, header, headline, lead, note, visual }: KeywordHeroProps) {
    return (
        <section aria-labelledby="keyword-hero-title" className="relative isolate overflow-hidden bg-white text-[#151313] min-[761px]:min-h-svh">
            {/* Header */}
            {header}

            {/* Hero content */}
            <div className="relative pt-6 pb-21.5 min-[421px]:max-[760px]:pt-10.75 min-[761px]:min-h-[calc(100svh-112px)] min-[761px]:py-0">
                {/* Background */}
                <HeroBackground />
                <div className="relative mx-auto grid w-[calc(100%-40px)] max-w-305 grid-cols-1 items-center min-[761px]:min-h-[calc(100svh-112px)] min-[761px]:w-[calc(100%-64px)] min-[761px]:grid-cols-2">
                    <div className="relative z-20 self-center min-[761px]:py-2.5">
                        {/* Keyword: the page's h1 */}
                        <h1
                            className="m-0 max-w-135 bg-[linear-gradient(90deg,#d27b9b_0%,#e78274_40%,#f4905f_100%)] bg-clip-text text-[12px] leading-[1.45] font-black tracking-[0.16em] text-transparent uppercase min-[761px]:text-[13px]"
                            id="keyword-hero-title"
                        >
                            {h1}
                        </h1>

                        {/* Title */}
                        <p className="mt-4 mb-0 max-w-142.5 font-[Baskerville,Georgia,serif] text-[clamp(36px,10.5vw,52px)] leading-[.98] font-normal tracking-[-.05em] text-balance min-[761px]:text-[clamp(46px,3.6vw,68px)]">
                            {headline}
                        </p>

                        {/* Summary */}
                        <p className="mt-5 mb-0 max-w-135 text-[clamp(18px,1.35vw,22px)] leading-[1.35] text-balance">{lead}</p>
                        <p className="mt-3 mb-0 max-w-135 text-[clamp(14px,1vw,16px)] leading-snug text-[#151313]/70">{note}</p>

                        {/* Actions */}
                        {actions}
                    </div>

                    {/* Phone and floating posts */}
                    {visual}
                </div>
            </div>
        </section>
    );
}
