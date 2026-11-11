import { useTranslations } from 'next-intl';

import { CATALOGUE_GRID } from '@/components/saveMyDate/storefront/storefrontStyles';

const PLACEHOLDERS = 8;

// Grey cards in the grid's shape while the themes load.
export function ThemeCatalogueLoading() {
    const t = useTranslations('SaveMyDateStorefront.catalogue');

    return (
        <div aria-busy="true" aria-label={t('loading')} className={CATALOGUE_GRID} role="status">
            {Array.from({ length: PLACEHOLDERS }, (_, index) => (
                <div key={index} className="aspect-[9/15.6] animate-pulse rounded-3xl bg-[#151313]/6 motion-reduce:animate-none" />
            ))}
        </div>
    );
}
