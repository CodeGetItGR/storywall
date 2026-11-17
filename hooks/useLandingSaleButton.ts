'use client';

import { useLocale } from 'next-intl';
import { useCallback, useSyncExternalStore } from 'react';

import { useCookieConsent } from '@/hooks/useCookieConsent';
import { useLiveDiscountCampaign } from '@/hooks/useLiveDiscountCampaign';
import { useSiteNoticeDismissals } from '@/hooks/useSiteNoticeDismissals';
import { discountCampaignDismissalKey } from '@/lib/discountCampaign';
import { numberFormat } from '@/lib/format';
import { saleButtonInScrollRange } from '@/lib/landingSaleButton';
import { useCreateWizardEnabled } from '@/providers/CreateWizardFlagProvider';

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

// The live campaign's percent, formatted, or null when there is none or its notice was closed.
export function useLandingSalePercent(): string | null {
    const locale = useLocale();
    const campaign = useLiveDiscountCampaign();
    const { dismissed } = useSiteNoticeDismissals('');
    const eligible = campaign !== null && !dismissed.has(discountCampaignDismissalKey(campaign.id));
    return eligible ? numberFormat(locale).format(campaign.percent) : null;
}

// percent: the live campaign's, null when there is none, its notice was closed, or the create wizard is
// on (the phone create button carries the offer then). visible: also no cookie question on screen (it
// sits in the same spot) and the visitor is between the hero and the plans.
export function useLandingSaleButton(pricingId: string) {
    const salePercent = useLandingSalePercent();
    const percent = useCreateWizardEnabled() ? null : salePercent;
    const { consent } = useCookieConsent();
    const inRange = useSaleButtonScrollRange(pricingId, percent !== null);

    return {
        percent,
        visible: percent !== null && inRange && consent !== null && consent !== undefined,
    };
}
