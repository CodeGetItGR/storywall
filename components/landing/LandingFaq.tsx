import { getTranslations } from 'next-intl/server';

import { LandingFaqItem } from '@/components/landing/LandingFaqItem';

type FaqItem = [question: string, answer: string];

export async function LandingFaq() {
    const t = await getTranslations('LandingPage.faq');
    const items = t.raw('items') as FaqItem[];

    return (
        /* FAQ */
        <section
            className="relative block overflow-hidden bg-white px-5 pt-12 pb-14.5 font-[Arial,Helvetica,sans-serif] text-[#151313] min-[761px]:px-[clamp(24px,7vw,120px)] min-[761px]:pt-16 min-[761px]:pb-18"
            id="faq"
        >
            <div className="mb-6.5 block w-full max-w-295 min-[761px]:mx-auto min-[761px]:mb-7.5 min-[761px]:grid min-[761px]:grid-cols-[auto_minmax(0,1fr)] min-[761px]:items-end min-[761px]:gap-x-10.5 min-[761px]:gap-y-2">
                <div className="mb-3 pt-3 text-[13px] leading-normal font-black tracking-[0.15em] min-[761px]:col-span-2 min-[761px]:mb-1.5">
                    {t('eyebrow')}
                </div>
                <h2 className="m-0 [font-family:var(--editorial)] text-[68px] leading-[0.82] font-normal tracking-[-0.065em] min-[761px]:col-start-1 min-[761px]:row-start-2 min-[761px]:text-[clamp(64px,6.5vw,104px)]">
                    {t('heading')}
                </h2>
                <p className="mt-2.5 mb-2 max-w-[92%] text-[13px] leading-[1.45] min-[761px]:col-start-2 min-[761px]:row-start-2 min-[761px]:mt-0 min-[761px]:max-w-107.5 min-[761px]:text-sm">
                    {t('intro')}
                </p>
            </div>
            <div className="mx-auto w-full max-w-295 border-t border-[rgb(21_19_19/26%)]">
                {items.map(([question, answer], index) => (
                    <LandingFaqItem answer={answer} index={index} key={question} question={question} />
                ))}
            </div>
        </section>
    );
}
