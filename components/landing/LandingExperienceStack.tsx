'use client';

import { useTranslations } from 'next-intl';
import { useRef } from 'react';

import { LandingExperienceLayer } from '@/components/landing/LandingExperienceLayer';
import { useLandingStackMotion } from '@/hooks/useLandingStackMotion';
import { hostExperienceAssets, socialExperienceAssets } from '@/lib/landingExperienceMedia';

export function LandingExperienceStack() {
    const stackRef = useRef<HTMLElement>(null);
    const t = useTranslations('LandingPage.stack');
    const socialTitle = t.raw('socialTitle') as string[];
    const socialAlts = t.raw('socialAlts') as string[];
    const hostAlts = t.raw('hostAlts') as string[];
    useLandingStackMotion(stackRef);

    return (
        <section className="swx-stack" id="swxStack" ref={stackRef}>
            <div className="swx-stage">
                <LandingExperienceLayer
                    alts={socialAlts}
                    assets={socialExperienceAssets}
                    chapter={t('socialChapter')}
                    chapterCount="01 / 02"
                    copy={t('socialCopy')}
                    cue={t('scroll')}
                    phoneImage="/landing/decor-01.jpg"
                    title={socialTitle}
                    topbar={t('socialTopbar')}
                />
                <LandingExperienceLayer
                    alts={hostAlts}
                    assets={hostExperienceAssets}
                    chapter={t('hostChapter')}
                    chapterCount="02 / 02"
                    copy={t('hostCopy')}
                    host
                    phoneImage="/landing/decor-04.jpg"
                    title={[t('hostTitle')]}
                    topbar={t('hostTopbar')}
                />
            </div>
        </section>
    );
}
