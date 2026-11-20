'use client';

import { useTranslations } from 'next-intl';

import { useLandingSaleButton } from '@/hooks/useLandingSaleButton';
import { SALE_BUTTON_CLASS } from '@/lib/landingSaleButton';
import { landingClickAttributes } from '@/lib/landingTracking';
import { cn } from '@/lib/utils';

// Phones and tablets, during a discount campaign: a floating link down to the plans. The countdown
// stays in the notice bar. Ink text, as white on this gradient is too low in contrast. With the create
// wizard on it renders nothing: the phone create button carries the offer, so phones show one bar.
export function LandingSaleButton({ pricingId = 'pricing' }: { pricingId?: string }) {
    const t = useTranslations('SiteNotice');
    const { percent, visible } = useLandingSaleButton(pricingId);

    if (percent === null) return null;

    return (
        <a
            className={cn(SALE_BUTTON_CLASS, visible ? 'visible translate-y-0 opacity-100' : 'invisible translate-y-4 opacity-0')}
            href={`#${pricingId}`}
            {...landingClickAttributes({ event: 'plans', placement: 'sale_button' })}
        >
            {/* Offer */}
            <span className="min-w-0 font-medium">{t('campaignButton', { percent })}</span>

            {/* Action */}
            <span className="flex shrink-0 items-center gap-2 font-bold">
                {t('seePlans')}
                <span aria-hidden="true" className="grid size-9 place-items-center rounded-full bg-white text-[18px] leading-none">
                    ↓
                </span>
            </span>
        </a>
    );
}
