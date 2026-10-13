import { getTranslations } from 'next-intl/server';
import { Fragment } from 'react';

import { LandingExperienceAsset } from '@/components/landing/LandingExperienceAsset';
import type { Locale } from '@/i18n/config';
import { socialExperienceAssets } from '@/lib/landingExperienceMedia';
import type { Occasion } from '@/lib/occasions/occasions';

// The landing's floating collage of posts, comments and reactions, with the occasion's heading.
export async function OccasionScene({ locale, occasion }: { locale: Locale; occasion: Occasion }) {
    const t = await getTranslations({ locale, namespace: `OccasionPages.${occasion.eventType}.scene` });
    const title = t.raw('title') as string[];

    return (
        <div className="landing-page">
            <section className="swx-stack">
                <div className="swx-layer swx-layer-1">
                    {/* Heading */}
                    <div className="swx-center">
                        <h2>
                            {title.map((line, index) => (
                                <Fragment key={line}>
                                    {index ? <br /> : null}
                                    {line}
                                </Fragment>
                            ))}
                        </h2>
                        <p>{t('copy')}</p>
                    </div>

                    {/* Floating collage */}
                    {socialExperienceAssets.map((asset) => (
                        <LandingExperienceAsset asset={asset} host={false} key={asset.src} />
                    ))}
                </div>
            </section>
        </div>
    );
}
