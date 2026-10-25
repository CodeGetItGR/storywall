import { useTranslations } from 'next-intl';

import type { WeddingMockCopy } from '@/lib/occasions/weddingCopy';

// Days, hours, minutes, seconds to the wedding: part of the picture, the same in every language.
const COUNTDOWN = ['116', '8', '47', '36'] as const;

// The feed's top bar: logo and the countdown, with the unit letters from copy.
export function FeedAppBar({ units }: { units: WeddingMockCopy['units'] }) {
    const t = useTranslations('ImageAlt');

    return (
        <div className="flex items-center justify-between px-[4cqw] pt-[4cqw] pb-[3cqw]">
            {/* Logo */}
            <span className="flex items-center gap-[2cqw]">
                {/* eslint-disable-next-line @next/next/no-img-element -- static SVG mark */}
                <img alt={t('appIcon')} className="h-[9cqw] w-auto" height={32} src="/assets/Logo.svg" width={30} />
                {/* eslint-disable-next-line @next/next/no-img-element -- static SVG wordmark */}
                <img alt={t('storywallLogo')} className="h-[8.4cqw] w-auto" height={28} src="/assets/LogoText.svg" width={117} />
            </span>
            {/* Countdown */}
            <span className="flex gap-[3cqw] text-center [font-family:var(--editorial)] leading-none">
                {COUNTDOWN.map((value, index) => (
                    <span className="flex flex-col gap-[0.8cqw]" key={value}>
                        <span className="text-[5.3cqw] font-bold">{value}</span>
                        <span className="text-[3.6cqw] text-[#151313]/55">{units[index]}</span>
                    </span>
                ))}
            </span>
        </div>
    );
}
