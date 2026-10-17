import { getTranslations } from 'next-intl/server';

import type { Locale } from '@/i18n/config';
import { getPublicLandingPath } from '@/i18n/publicLocale';
import { loadLiveOccasions } from '@/lib/occasions/liveOccasions.server';
import { type Occasion, occasionPath } from '@/lib/occasions/occasions';

export async function OccasionLinks({ locale, occasion }: { locale: Locale; occasion: Occasion }) {
    const common = await getTranslations({ locale, namespace: 'OccasionPages.common' });
    const pages = await getTranslations({ locale, namespace: 'OccasionPages' });
    const others = (await loadLiveOccasions()).filter((other) => other.eventType !== occasion.eventType);

    return (
        <nav
            aria-label={common('linksHeading')}
            className="mx-auto flex w-full max-w-295 flex-wrap items-center gap-x-6 gap-y-2 px-5 py-10 text-sm min-[761px]:px-0"
        >
            <span className="w-full text-[13px] font-extrabold tracking-[0.14em] text-[#e97a6f] uppercase min-[761px]:w-auto">
                {common('linksHeading')}
            </span>
            {others.map((other) => (
                <a className="underline-offset-4 hover:underline" href={occasionPath(other, locale)} key={other.eventType}>
                    {pages(`${other.eventType}.name`)}
                </a>
            ))}
            <a className="underline-offset-4 hover:underline" href={getPublicLandingPath(locale)}>
                {common('linksHome')}
            </a>
        </nav>
    );
}
