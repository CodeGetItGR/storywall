import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';

import { WeddingSectionHead } from '@/components/occasions/wedding/WeddingSectionHead';
import { WeddingWrap } from '@/components/occasions/wedding/WeddingWrap';
import { WhyMarquee } from '@/components/occasions/wedding/why/WhyMarquee';
import { WhyQrSteps } from '@/components/occasions/wedding/why/WhyQrSteps';
import { WhyStats } from '@/components/occasions/wedding/why/WhyStats';
import { WHY_LABEL_CLASS, WhyWithout } from '@/components/occasions/wedding/why/WhyWithout';
import type { Locale } from '@/i18n/config';
import type { WeddingMarqueeCopy, WeddingStatCopy } from '@/lib/occasions/weddingCopy';
import { WEDDING_MARQUEE, WEDDING_QR_PHOTO, WEDDING_WITHOUT_PHOTOS } from '@/lib/occasions/weddingMedia';
import { cn } from '@/lib/utils';

type WeddingWhyProps = {
    locale: Locale;
    // The QR wedding page while it is live, else null.
    qrHref: string | null;
};

// Why StoryWall: the photos lost without it, then the same wedding with it.
export async function WeddingWhy({ locale, qrHref }: WeddingWhyProps) {
    const t = await getTranslations({ locale, namespace: 'OccasionPages.WEDDING.why' });
    const bold = (chunks: ReactNode) => <strong className="font-bold">{chunks}</strong>;
    const steps = (t.raw('with.steps') as { title: string }[]).map((step, index) => ({
        title: step.title,
        body: t.rich(`with.steps.${index}.body`, { b: bold }),
    }));
    const tiles = (t.raw('with.marquee') as WeddingMarqueeCopy[]).map((copy, index) => ({
        ...copy,
        ...WEDDING_MARQUEE[index]!,
        alt: t('with.photoAlt', copy),
    }));

    return (
        <section
            aria-labelledby="wedding-why-title"
            className="bg-white py-17.5 font-[Arial,Helvetica,sans-serif] text-[#151313] min-[861px]:pt-22.5 min-[861px]:pb-25"
        >
            <WeddingWrap>
                {/* Heading */}
                <WeddingSectionHead
                    className="mb-11.5 max-w-245"
                    heading={t.raw('heading') as [string, string]}
                    headingClassName="text-[clamp(38px,4.2vw,68px)] leading-[0.97] tracking-[-0.045em]"
                    id="wedding-why-title"
                    kicker={t('kicker')}
                />
                {/* Without StoryWall */}
                <WhyWithout
                    bubbles={t.raw('without.bubbles') as [string, string]}
                    items={t.raw('without.items') as string[]}
                    label={t('without.label')}
                    photos={WEDDING_WITHOUT_PHOTOS}
                />
            </WeddingWrap>

            <WeddingWrap>
                {/* With StoryWall */}
                <div className="mt-5.5 overflow-hidden rounded-[30px] bg-[#f4f0e8] pt-7.5 pb-8.5">
                    <p className={cn(WHY_LABEL_CLASS, 'text-center text-[#ff765f]')}>{t('with.label')}</p>
                    <p className="mx-4.5 mt-4 mb-7.5 text-center [font-family:var(--editorial)] text-[24px] leading-[1.22] tracking-[-0.025em] min-[761px]:mx-auto min-[761px]:mt-4.5 min-[761px]:mb-9 min-[761px]:max-w-237.5 min-[761px]:text-[clamp(24px,2.35vw,32px)]">
                        {t('with.subtitle')}
                    </p>
                    {/* QR row */}
                    <WhyQrSteps alt={t('with.qrAlt')} photo={WEDDING_QR_PHOTO} qrHref={qrHref} steps={steps} />
                    {/* Guests' photos */}
                    <WhyMarquee tiles={tiles} />
                    {/* Example and points */}
                    <WhyStats chips={t.raw('with.chips') as string[]} example={t('with.example')} stats={t.raw('with.stats') as WeddingStatCopy[]} />
                </div>
            </WeddingWrap>
        </section>
    );
}
