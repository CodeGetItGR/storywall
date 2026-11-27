import type { ReactNode } from 'react';

import { RsvpChecklist } from '@/components/occasions/sections/rsvp/RsvpChecklist';
import { RsvpPictures } from '@/components/occasions/sections/rsvp/RsvpPictures';
import type { OccasionCardCopy } from '@/lib/occasions/pageCopy';
import type { OccasionRsvpPictures } from '@/lib/occasions/pageMedia';

export type RsvpViewProps = {
    alts: { both: string; with: string; without: string };
    checklist: { items: OccasionCardCopy[]; pill: string };
    heading: [string, string];
    intro: ReactNode;
    kicker: string;
    pictures: OccasionRsvpPictures;
};

// RSVP: replies scattered across apps against StoryWall's form, list and stats, on a pink panel.
export function RsvpView({ alts, checklist, heading, intro, kicker, pictures }: RsvpViewProps) {
    return (
        <section aria-labelledby="rsvp-title" className="bg-white pt-5.5 pb-15 font-[Arial,Helvetica,sans-serif] text-[#151313]">
            <div className="mx-auto w-[calc(100%-36px)] rounded-[22px] bg-[linear-gradient(135deg,#fbedf1_0%,#fcefea_40%,#fdf1e8_70%,#fef5e9_100%)] px-3 pt-9 pb-5 min-[761px]:w-[min(1220px,calc(100%-64px))] min-[761px]:rounded-[30px] min-[761px]:px-[clamp(16px,2.6vw,36px)] min-[761px]:pt-[clamp(40px,5vw,70px)] min-[761px]:pb-[clamp(30px,3.5vw,48px)]">
                {/* Heading */}
                <div className="mx-auto mb-[clamp(28px,3.5vw,46px)] max-w-250 text-center">
                    <p className="mt-0 mb-4.5 text-[11px] font-extrabold tracking-[0.16em] text-[#ff765f] uppercase">{kicker}</p>
                    <h2
                        className="m-0 [font-family:var(--editorial)] text-[clamp(36px,4.4vw,68px)] leading-[1.02] font-normal tracking-[-0.04em]"
                        id="rsvp-title"
                    >
                        {heading[0]}{' '}
                        <span className="mx-auto block w-fit [background-image:var(--brand-gradient)] bg-clip-text pb-[0.08em] text-transparent">
                            {heading[1]}
                        </span>
                    </h2>
                    <p className="mx-auto mt-5.5 mb-0 max-w-160 text-[clamp(16px,1.45vw,19px)] leading-[1.55] text-[#6f6a64]">{intro}</p>
                </div>
                {/* Pictures and points */}
                <div className="grid grid-cols-1 items-stretch gap-[clamp(14px,1.8vw,26px)] min-[901px]:grid-cols-[minmax(0,1022fr)_minmax(0,370fr)]">
                    <RsvpPictures alts={alts} pictures={pictures} />
                    <RsvpChecklist items={checklist.items} pill={checklist.pill} />
                </div>
            </div>
        </section>
    );
}
