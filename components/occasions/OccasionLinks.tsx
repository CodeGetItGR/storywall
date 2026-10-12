import { getTranslations } from 'next-intl/server';

import type { Locale } from '@/i18n/config';
import { getPublicLandingPath } from '@/i18n/publicLocale';
import { type Occasion, occasionPath, readyOccasions } from '@/lib/occasions/occasions';

export async function OccasionLinks({ locale, occasion }: { locale: Locale; occasion: Occasion }) {
    const common = await getTranslations({ locale, namespace: 'OccasionPages.common' });
    const pages = await getTranslations({ locale, namespace: 'OccasionPages' });
    const others = readyOccasions().filter((other) => other.eventType !== occasion.eventType);

    return (
        <nav aria-label={common('linksHeading')} className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-8 text-sm min-[761px]:px-[5vw]">
            <span className="font-black tracking-[0.12em] uppercase">{common('linksHeading')}</span>
            {others.map((other) => (
                <a href={occasionPath(other, locale)} key={other.eventType}>
                    {pages(`${other.eventType}.name`)}
                </a>
            ))}
            <a href={getPublicLandingPath(locale)}>{common('linksHome')}</a>
        </nav>
    );
}
