'use client';

import { useTranslations } from 'next-intl';

import { LandingFaqItem } from '@/components/landing/LandingFaqItem';

type FaqItem = [question: string, answer: string];

export function LandingFaq() {
    const t = useTranslations('LandingPage.faq');
    const items = t.raw('items') as FaqItem[];

    return (
        <section className="swfaq swfaq-editorial" id="faq">
            <div className="swfaq-editorial-left">
                <div className="swfaq-kicker">{t('eyebrow')}</div>
                <h2>{t('heading')}</h2>
                <p>{t('intro')}</p>
            </div>
            <div className="swfaq-editorial-list">
                {items.map(([question, answer], index) => (
                    <LandingFaqItem answer={answer} index={index} key={question} question={question} />
                ))}
            </div>
        </section>
    );
}
