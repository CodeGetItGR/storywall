'use client';

import { useTranslations } from 'next-intl';

import { LandingExperienceLayer } from '@/components/landing/LandingExperienceLayer';
import { hostExperienceAssets, socialExperienceAssets } from '@/lib/landingExperienceMedia';

export function LandingExperienceStack() {
    const t = useTranslations('LandingPage.stack');
    const socialTitle = t.raw('socialTitle') as string[];

    return (
        <section className="swx-stack">
            {/* Chapter 01 — social side */}
            <LandingExperienceLayer
                assets={socialExperienceAssets}
                chapter={t('socialChapter')}
                chapterCount="01 / 02"
                copy={t('socialCopy')}
                title={socialTitle}
                topbar={t('socialTopbar')}
            />

            {/* Chapter 02 — host side */}
            <LandingExperienceLayer
                assets={hostExperienceAssets}
                chapter={t('hostChapter')}
                chapterCount="02 / 02"
                copy={t('hostCopy')}
                host
                title={[t('hostTitle')]}
                topbar={t('hostTopbar')}
            />
        </section>
    );
}
