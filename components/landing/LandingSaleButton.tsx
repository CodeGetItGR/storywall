'use client';

import { useTranslations } from 'next-intl';

import { useLandingSaleButton } from '@/hooks/useLandingSaleButton';
import { landingClickAttributes } from '@/lib/landingTracking';
import { cn } from '@/lib/utils';

// Phones and tablets, during a discount campaign: a floating link down to the plans. The countdown
// stays in the notice bar. Ink text, as white on this gradient is too low in contrast.
export function LandingSaleButton({ pricingId = 'pricing' }: { pricingId?: string }) {
    const t = useTranslations('SiteNotice');
    const { percent, visible } = useLandingSaleButton(pricingId);

    if (percent === null) return null;

    return (
        <a
            className={cn(
                'fixed inset-x-3 bottom-[calc(var(--visual-viewport-bottom-inset,0px)+env(safe-area-inset-bottom,0px)+0.75rem)] z-30 mx-auto flex min-h-14 max-w-xl items-center justify-between gap-3 rounded-full bg-[linear-gradient(100deg,#ff6f93,#ff936a_52%,#ffd05b)] py-2 pr-2 pl-5 text-[15px] leading-tight text-[#151313] shadow-[0_12px_30px_rgba(36,31,26,0.28)] focus-ring transition-[opacity,translate,visibility] duration-200 motion-reduce:transition-none min-[761px]:hidden',
                visible ? 'visible translate-y-0 opacity-100' : 'invisible translate-y-4 opacity-0',
            )}
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
