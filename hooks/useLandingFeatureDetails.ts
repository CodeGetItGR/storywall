import { useTranslations } from 'next-intl';
import { useState } from 'react';

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

export function useLandingFeatureDetails() {
    const t = useTranslations('LandingPage.featureDetails');
    const { isAvailable } = useLandingModuleGates();
    const [selectedIndex, setSelectedIndex] = useState(0);
    const details = t.raw('items') as FeatureDetail[];
    const availableDetails = details.flatMap((detail, index) =>
        isAvailable(LANDING_FEATURE_DETAIL_MODULE_KEYS[index] ?? null) ? [{ ...detail, imagePath: FEATURE_IMAGES[index]! }] : []
    );

    const activeIndex = selectedIndex >= availableDetails.length ? 0 : selectedIndex;
    const selectDetail = (index: number) => () => setSelectedIndex(index);

    return {
        activeDetail: availableDetails[activeIndex] ?? null,
        availableDetails,
        selectedIndex: activeIndex,
        selectDetail,
        t,
    };
}
