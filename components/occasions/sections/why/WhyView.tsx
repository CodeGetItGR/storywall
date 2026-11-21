import type { ReactNode } from 'react';

import { SectionHead } from '@/components/occasions/sections/SectionHead';
import { SectionWrap } from '@/components/occasions/sections/SectionWrap';
import type { WhyGuestTileData } from '@/components/occasions/sections/why/WhyGuestTile';
import { WhyMarquee } from '@/components/occasions/sections/why/WhyMarquee';
import { WhyPhotoRow } from '@/components/occasions/sections/why/WhyPhotoRow';
import { WhyQrSteps } from '@/components/occasions/sections/why/WhyQrSteps';
import { WhyStats } from '@/components/occasions/sections/why/WhyStats';
import { WHY_LABEL_CLASS, WhyWithout } from '@/components/occasions/sections/why/WhyWithout';
import type { OccasionPhoto } from '@/lib/occasions/occasionMedia';
import type { OccasionStatCopy } from '@/lib/occasions/pageCopy';
import { cn } from '@/lib/utils';

export type WhyViewProps = {
    heading: [string, string];
    kicker: string;
    without: { bubbles: [string, string]; items: string[]; label: string; photos: readonly OccasionPhoto[] };
    with: {
        label: string;
        subtitle: string;
        // The QR row; its first step links to the QR page while `href` is set.
        qr: { alt: string; href: string | null; photo: OccasionPhoto; steps: { body: ReactNode; title: string }[] };
        guestPhotos: { layout: 'marquee' | 'row'; tiles: WhyGuestTileData[] };
        stats: { chips: string[]; example: string; stats: OccasionStatCopy[] };
    };
};

// Why StoryWall: the photos lost without it, then the same occasion with it.
export function WhyView({ heading, kicker, with: withStoryWall, without }: WhyViewProps) {
    const { guestPhotos, qr, stats } = withStoryWall;

    return (
        <section
            aria-labelledby="why-title"
            className="bg-white py-17.5 font-[Arial,Helvetica,sans-serif] leading-[normal] text-[#151313] min-[861px]:pt-22.5 min-[861px]:pb-25"
        >
            <SectionWrap>
                {/* Heading */}
                <SectionHead
                    className="mb-11.5 max-w-245"
                    heading={heading}
                    headingClassName="text-[clamp(38px,4.2vw,68px)] leading-[0.97] tracking-[-0.045em]"
                    id="why-title"
                    kicker={kicker}
                />
                {/* Without StoryWall */}
                <WhyWithout bubbles={without.bubbles} items={without.items} label={without.label} photos={without.photos} />
            </SectionWrap>

            <SectionWrap>
                {/* With StoryWall */}
                <div className="mt-5.5 overflow-hidden rounded-[30px] bg-[#f4f0e8] pt-7.5 pb-8.5">
                    <p className={cn(WHY_LABEL_CLASS, 'text-center text-[#ff765f]')}>{withStoryWall.label}</p>
                    <p className="mx-4.5 mt-4 mb-7.5 text-center [font-family:var(--editorial)] text-[24px] leading-[1.22] tracking-[-0.025em] min-[761px]:mx-auto min-[761px]:mt-4.5 min-[761px]:mb-9 min-[761px]:max-w-237.5 min-[761px]:text-[clamp(24px,2.35vw,32px)]">
                        {withStoryWall.subtitle}
                    </p>
                    {/* QR row */}
                    <WhyQrSteps alt={qr.alt} photo={qr.photo} qrHref={qr.href} steps={qr.steps} />
                    {/* Guests' photos */}
                    {guestPhotos.layout === 'row' ? <WhyPhotoRow tiles={guestPhotos.tiles} /> : <WhyMarquee tiles={guestPhotos.tiles} />}
                    {/* Example and points */}
                    <WhyStats chips={stats.chips} example={stats.example} stats={stats.stats} />
                </div>
            </SectionWrap>
        </section>
    );
}
