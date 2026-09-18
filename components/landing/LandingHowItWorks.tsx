'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

const STEP_ICONS = ['✦', '↗', '♥'] as const;

export function LandingHowItWorks() {
    const t = useTranslations('LandingPage.howItWorks');
    const steps = t.raw('steps') as { description: string; title: string }[];

    return (
        <section aria-labelledby="how-it-works-title" className="bg-canvas px-5 py-20 text-ink md:px-[7vw] md:py-32" id="howItWorks">
            {/* How it works */}
            <div className="mx-auto grid max-w-7xl gap-12 md:grid-cols-4 md:gap-8">
                <div className="md:col-span-1">
                    <p className="text-xs font-extrabold tracking-[0.16em]">{t('eyebrow')}</p>
                    <h2 className="mt-6 font-serif text-5xl leading-[0.86] tracking-[-0.06em] md:text-7xl" id="how-it-works-title">
                        {t('headingStart')}<br />{t('headingEnd')}
                    </h2>
                </div>
                {steps.map((step, index) => (
                    <motion.article className="border-t border-ink/25 pt-5" initial={{ opacity: 0, y: 20 }} key={step.title} transition={{ delay: index * 0.08 }} viewport={{ once: true, amount: 0.3 }} whileInView={{ opacity: 1, y: 0 }}>
                        <div className="flex items-center justify-between text-xs font-bold tracking-[0.14em]"><span>0{index + 1}</span><span aria-hidden="true" className="text-lg">{STEP_ICONS[index]}</span></div>
                        <h3 className="mt-16 font-serif text-4xl leading-none tracking-[-0.05em]">{step.title}</h3>
                        <p className="mt-5 max-w-xs text-sm leading-6 text-ink/70">{step.description}</p>
                    </motion.article>
                ))}
            </div>
        </section>
    );
}
