'use client';

import { useLocale } from 'next-intl';
import { useCallback, useSyncExternalStore } from 'react';

import { useCookieConsent } from '@/hooks/useCookieConsent';
import { useLiveDiscountCampaign } from '@/hooks/useLiveDiscountCampaign';
import { useSiteNoticeDismissals } from '@/hooks/useSiteNoticeDismissals';
import { discountCampaignDismissalKey } from '@/lib/discountCampaign';
import { numberFormat } from '@/lib/format';
import { saleButtonInScrollRange } from '@/lib/landingSaleButton';

function subscribeToScroll(listener: () => void) {
    window.addEventListener('scroll', listener, { passive: true });
    window.addEventListener('resize', listener);
    return () => {
        window.removeEventListener('scroll', listener);
        window.removeEventListener('resize', listener);
    };
}

function subscribeToNothing() {
    return () => undefined;
}

function isOutOfRangeOnServer() {
    return false;
}

function useSaleButtonScrollRange(pricingId: string, enabled: boolean): boolean {
    const isInRange = useCallback(
        () =>
            saleButtonInScrollRange({
                scrollY: window.scrollY,
                viewportHeight: window.innerHeight,
                pricingTop: document.getElementById(pricingId)?.getBoundingClientRect().top ?? null,
            }),
        [pricingId],
    );
    return useSyncExternalStore(enabled ? subscribeToScroll : subscribeToNothing, isInRange, isOutOfRangeOnServer);
}

// percent: the live campaign's, null when there is none or its notice was closed. visible: also no
// cookie question on screen (it sits in the same spot) and the visitor is between the hero and the plans.
export function useLandingSaleButton(pricingId: string) {
    const locale = useLocale();
    const campaign = useLiveDiscountCampaign();
    const { dismissed } = useSiteNoticeDismissals('');
    const { consent } = useCookieConsent();
    const eligible = campaign !== null && !dismissed.has(discountCampaignDismissalKey(campaign.id));
    const inRange = useSaleButtonScrollRange(pricingId, eligible);

    return {
        percent: eligible ? numberFormat(locale).format(campaign.percent) : null,
        visible: eligible && inRange && consent !== null && consent !== undefined,
    };
}
