'use client';

import { useTranslations } from 'next-intl';
import type { RefCallback } from 'react';

import { SECONDARY_BUTTON } from '@/components/saveMyDate/storefront/storefrontStyles';

type ThemeCatalogueMoreProps = { onLoadMore: () => void; sentinelRef: RefCallback<HTMLDivElement> };

// The next cards come in as the visitor nears the end; the button does the same on a slow connection.
export function ThemeCatalogueMore({ onLoadMore, sentinelRef }: ThemeCatalogueMoreProps) {
    const t = useTranslations('SaveMyDateStorefront.catalogue');

    return (
        <div className="mt-8 flex flex-col items-center">
            <div ref={sentinelRef} aria-hidden className="h-px w-full" />
            <button className={SECONDARY_BUTTON} type="button" onClick={onLoadMore}>
                {t('more')}
            </button>
        </div>
    );
}
