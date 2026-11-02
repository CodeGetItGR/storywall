import { getLocale, getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';

import { LandingFaqItem } from '@/components/landing/LandingFaqItem';
import type { Locale } from '@/i18n/config';
import { getQrWeddingPath } from '@/i18n/publicLocale';
import { landingSectionAttributes } from '@/lib/landingTracking';
import { qrLinkAttributes } from '@/lib/linkClicks';
import { loadQrWeddingPageLive } from '@/lib/qrWeddingPage.server';

type FaqItem = [question: string, answer: ReactNode];

// The landing question about guests needing an app ("Do guests need to download an app?"): its
// answer ends with a link to the QR wedding page while that page is live.
export const LANDING_QR_FAQ_INDEX = 1;

export type LandingFaqCopy = { heading: string; intro: string; items: FaqItem[] };

type LandingFaqProps = {
    // An occasion page's own questions; the landing reads its messages.
    copy?: LandingFaqCopy;
    // Heading and intro centered over the list.
    centered?: boolean;
    // Opening one answer closes the others.
    group?: string;
};

export async function LandingFaq({ copy, centered = false, group }: LandingFaqProps) {
    const t = await getTranslations('LandingPage.faq');
    const { heading, intro, items } = copy ?? { heading: t('heading'), intro: t('intro'), items: await landingFaqItems() };

    return (
        /* FAQ */
        <section
            className="relative block overflow-hidden bg-white px-5 pt-12 pb-14.5 font-[Arial,Helvetica,sans-serif] text-[#151313] min-[761px]:px-[clamp(24px,7vw,120px)] min-[761px]:pt-16 min-[761px]:pb-18"
            id="faq"
            {...landingSectionAttributes('faq')}
        >
            {centered ? (
                /* Heading and intro, centered */
                <div className="mx-auto mb-6.5 max-w-190 text-center min-[761px]:mb-7.5">
                    <h2 className="mt-0 mb-[.3em] [font-family:var(--editorial)] text-[68px] leading-[0.82] font-normal tracking-[-0.065em] min-[761px]:text-[clamp(48px,4.875vw,78px)]">
                        {heading}
                    </h2>
                    <p className="mx-auto max-w-107.5 text-[13px] leading-[1.45] min-[761px]:text-sm">{intro}</p>
                </div>
            ) : (
                /* Heading and intro, side by side */
                <div className="mb-6.5 block w-full max-w-295 min-[761px]:mx-auto min-[761px]:mb-7.5 min-[761px]:grid min-[761px]:grid-cols-[auto_minmax(0,1fr)] min-[761px]:items-end min-[761px]:gap-x-10.5 min-[761px]:gap-y-2">
                    <h2 className="m-0 [font-family:var(--editorial)] text-[68px] leading-[0.82] font-normal tracking-[-0.065em] min-[761px]:col-start-1 min-[761px]:row-start-2 min-[761px]:text-[clamp(64px,6.5vw,104px)]">
                        {heading}
                    </h2>
                    <p className="mt-2.5 mb-2 max-w-[92%] text-[13px] leading-[1.45] min-[761px]:col-start-2 min-[761px]:row-start-2 min-[761px]:mt-0 min-[761px]:max-w-107.5 min-[761px]:text-sm">
                        {intro}
                    </p>
                </div>
            )}
            {/* Questions */}
            <div className="mx-auto w-full max-w-295 border-t border-[rgb(21_19_19/26%)]">
                {items.map(([question, answer], index) => (
                    <LandingFaqItem answer={answer} group={group} index={index} key={question} question={question} />
                ))}
            </div>
        </section>
    );
}

// The landing's own questions, with the QR page link while that page is live.
async function landingFaqItems(): Promise<FaqItem[]> {
    const t = await getTranslations('LandingPage.faq');
    const items = t.raw('items') as [string, string][];
    if (!(await loadQrWeddingPageLive())) return items;
    const href = getQrWeddingPath((await getLocale()) as Locale);
    return items.map(([question, answer], index): FaqItem =>
        index === LANDING_QR_FAQ_INDEX
            ? [
                  question,
                  <>
                      {answer}{' '}
                      {t.rich('qrMore', {
                          link: (chunks) => (
                              <a className="text-inherit underline! underline-offset-3 focus-ring" href={href} {...qrLinkAttributes('faq')}>
                                  {chunks}
                              </a>
                          ),
                      })}
                  </>,
              ]
            : [question, answer],
    );
}
