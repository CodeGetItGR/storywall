import { getTranslations } from 'next-intl/server';

import { PartnerCardVariant } from '@/components/feed/partner/PartnerFeedCard';
import { BODY, H2, INNER, SECTION } from '@/components/forBusiness/forBusinessStyles';
import type { PartnerBrandingCardContent } from '@/hooks/usePartnerBrandingCard';

const BENEFITS = ['discount', 'earn', 'brand', 'portal'] as const;

export async function ForBusinessBenefits({ showFreeEvent }: { showFreeEvent: boolean }) {
    const t = await getTranslations('ForBusinessPage');
    const card = await getTranslations('PartnerCard');

    // A sample of the real feed card, unlinked (href null), as the admin preview renders it.
    const sample: PartnerBrandingCardContent = {
        href: null,
        name: t('sampleCard.name'),
        roleLabel: card('roles.PLANNER'),
        partnerLabel: card('partner'),
        tagline: t('sampleCard.tagline'),
        services: t('sampleCard.services'),
        logoUrl: null,
        coverUrl: '/landing/04-wedding-reception-santorini.webp',
        newTabLabel: card('newTab'),
        visitLabel: card('visit'),
    };

    return (
        /* What you get */
        <section className={SECTION}>
            <div className={`${INNER} grid gap-10 min-[761px]:grid-cols-[1.1fr_0.9fr] min-[761px]:items-start`}>
                {/* Benefits */}
                <div>
                    <h2 className={H2}>{t('benefits.heading')}</h2>
                    <dl className="mt-8 grid gap-6">
                        {BENEFITS.map((key) => (
                            <div key={key}>
                                <dt className="text-lg font-semibold">{t(`benefits.items.${key}.title`)}</dt>
                                <dd className={`m-0 mt-1 ${BODY}`}>{t(`benefits.items.${key}.body`)}</dd>
                            </div>
                        ))}
                        {showFreeEvent && (
                            <div>
                                <dt className="text-lg font-semibold">{t('freeEvent.title')}</dt>
                                <dd className={`m-0 mt-1 ${BODY}`}>{t('freeEvent.body')}</dd>
                            </div>
                        )}
                    </dl>
                </div>
                {/* Card preview */}
                <figure className="m-0">
                    <div className="pointer-events-none" aria-hidden="true">
                        <PartnerCardVariant variant="FEATURE_CARD" content={sample} />
                    </div>
                    <figcaption className={`mt-3 ${BODY}`}>{t('benefits.cardCaption')}</figcaption>
                </figure>
            </div>
        </section>
    );
}
