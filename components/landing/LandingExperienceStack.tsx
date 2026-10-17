'use client';

import { useTranslations } from 'next-intl';

import { LandingExperienceLayer } from '@/components/landing/LandingExperienceLayer';
import { hostExperienceAssets, socialExperienceAssets } from '@/lib/landingExperienceMedia';
import { landingSectionAttributes } from '@/lib/landingTracking';

// An occasion page's own words for the social side.
export type LandingSocialCopy = { copy: string; title: string[] };

export function LandingExperienceStack({ social }: { social?: LandingSocialCopy }) {
    const t = useTranslations('LandingPage.stack');
    const socialTitle = social?.title ?? (t.raw('socialTitle') as string[]);
    const hostTitle = t.raw('hostTitle') as string[];

    return (
        <section className="swx-stack" {...landingSectionAttributes('social_host')}>
            {/* Chapter 01 — social side */}
            <LandingExperienceLayer
                assets={socialExperienceAssets}
                chapter={t('socialChapter')}
                chapterCount="01 / 02"
                copy={social?.copy ?? t('socialCopy')}
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
                title={hostTitle}
                topbar={t('hostTopbar')}
            />
        </section>
    );
}
