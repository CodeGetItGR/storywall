import { useTranslations } from 'next-intl';

import { LandingFeatureDetailCard } from '@/components/landing/LandingFeatureDetailCard';
import { useLandingModuleGates } from '@/hooks/useLandingModuleGates';
import { LANDING_FEATURE_DETAIL_MODULE_KEYS } from '@/lib/landingFeatureGates';

const FEATURE_IMAGES = [
    '/landing/guest-viewing-the-storywall-invitation-on-a-phone.jpg',
    '/landing/guest-scanning-the-storywall-qr-code.jpg',
    '/landing/guest-confirming-the-storywall-rsvp.jpg',
    '/landing/guest-sharing-a-wish-in-the-storywall-guestbook.jpg',
] as const;

type FeatureDetail = {
    description: string;
    imageAlt: string;
    items: string[];
    subtitle: string;
    title: string;
};

export function LandingFeatureDetails() {
    const t = useTranslations('LandingPage.featureDetails');
    const details = t.raw('items') as FeatureDetail[];
    const { isAvailable } = useLandingModuleGates();
    const availableDetails = details.flatMap((detail, index) =>
        isAvailable(LANDING_FEATURE_DETAIL_MODULE_KEYS[index] ?? null) ? [{ detail, imagePath: FEATURE_IMAGES[index]! }] : []
    );

    return (
        <section
            aria-labelledby="landing-feature-details-title"
            className="bg-[#0b0b0f] px-5 pt-2 pb-[72px] text-white min-[761px]:px-[5vw] min-[761px]:pt-5 min-[761px]:pb-[112px]"
        >
            {/* Feature introduction */}
            <div className="mx-auto max-w-[1500px] min-[761px]:ml-[37.42vw] min-[761px]:max-w-[620px]">
                <p className="text-[11px] font-black tracking-[0.15em] text-[#f2c66a] uppercase min-[761px]:text-[13px]">{t('eyebrow')}</p>
                <h2
                    className="mt-4 font-[var(--editorial)] text-[clamp(38px,4vw,62px)] leading-[0.95] tracking-[-0.045em]"
                    id="landing-feature-details-title"
                >
                    {t('heading')}
                </h2>
            </div>

            {/* Feature cards */}
            <div
                aria-label={t('label')}
                className="mx-auto mt-9 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 [-webkit-overflow-scrolling:touch] min-[761px]:mt-12 min-[761px]:grid min-[761px]:max-w-[1500px] min-[761px]:grid-cols-2 min-[761px]:gap-6 min-[761px]:overflow-visible min-[761px]:pb-0 min-[1440px]:grid-cols-4 min-[1440px]:gap-[18px]"
            >
                {availableDetails.map(({ detail, imagePath }) => (
                    <div className="w-[min(84vw,350px)] shrink-0 min-[761px]:w-auto min-[761px]:shrink" key={detail.title}>
                        <LandingFeatureDetailCard {...detail} imagePath={imagePath} />
                    </div>
                ))}
            </div>
        </section>
    );
}
