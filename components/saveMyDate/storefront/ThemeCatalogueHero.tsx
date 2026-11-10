import { useTranslations } from 'next-intl';

import { HEADING_SERIF, STOREFRONT_WRAP } from '@/components/saveMyDate/storefront/storefrontStyles';
import { cn } from '@/lib/utils';

// The catalogue's heading and one line under it.
export function ThemeCatalogueHero() {
    const t = useTranslations('SaveMyDateStorefront.catalogue');

    return (
        <section className="bg-[linear-gradient(180deg,#fdf3ee_0%,#ffffff_100%)] pt-8 pb-6 min-[761px]:pt-14 min-[761px]:pb-10">
            <div className={STOREFRONT_WRAP}>
                {/* Heading */}
                <h1 className={cn(HEADING_SERIF, 'm-0 max-w-180 text-[clamp(34px,9vw,44px)] leading-[1.02] min-[761px]:text-[clamp(44px,4vw,60px)]')}>
                    {t('heading')}
                </h1>

                {/* Intro */}
                <p className="mt-3 mb-0 max-w-135 text-[17px] leading-snug text-[#151313]/75 min-[761px]:mt-4 min-[761px]:text-[19px]">{t('intro')}</p>
            </div>
        </section>
    );
}
