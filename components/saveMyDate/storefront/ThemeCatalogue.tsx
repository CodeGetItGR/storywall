'use client';

import { useTranslations } from 'next-intl';

import { StorefrontMessage } from '@/components/saveMyDate/storefront/StorefrontMessage';
import { STOREFRONT_WRAP } from '@/components/saveMyDate/storefront/storefrontStyles';
import { ThemeCatalogueGrid } from '@/components/saveMyDate/storefront/ThemeCatalogueGrid';
import { ThemeCatalogueHero } from '@/components/saveMyDate/storefront/ThemeCatalogueHero';
import { ThemeCatalogueLoading } from '@/components/saveMyDate/storefront/ThemeCatalogueLoading';
import { ThemeCatalogueToolbar } from '@/components/saveMyDate/storefront/ThemeCatalogueToolbar';
import { useThemeCatalogue } from '@/hooks/useThemeCatalogue';
import type { CatalogueFilters } from '@/lib/invitation/themeCatalogue';

type ThemeCatalogueProps = {
    // The catalogue's own URL in the page's language, which the filters write their params onto.
    path: string;
    initialFilters: CatalogueFilters;
};

// The theme catalogue: heading, controls, and the cards or the state in their place.
export function ThemeCatalogue({ path, initialFilters }: ThemeCatalogueProps) {
    const t = useTranslations('SaveMyDateStorefront.catalogue');
    const { state, filters, setEventType, setQuery, setSort, columns, setColumns, loadMore, sentinelRef, retry } = useThemeCatalogue(path, initialFilters);

    return (
        <>
            {/* Heading */}
            <ThemeCatalogueHero />

            {/* Catalogue */}
            <section className="pb-16 min-[761px]:pb-24">
                <div className={STOREFRONT_WRAP}>
                    <ThemeCatalogueToolbar
                        columns={columns}
                        filters={filters}
                        onColumnsChange={setColumns}
                        onEventTypeChange={setEventType}
                        onQueryChange={setQuery}
                        onSortChange={setSort}
                    />

                    {state.kind === 'loading' ? <ThemeCatalogueLoading /> : null}
                    {state.kind === 'error' ? <StorefrontMessage message={t('error')} onRetry={retry} /> : null}
                    {state.kind === 'empty' ? <StorefrontMessage message={t('empty')} /> : null}
                    {state.kind === 'themes' ? (
                        <ThemeCatalogueGrid columns={columns} hasMore={state.hasMore} sentinelRef={sentinelRef} themes={state.themes} onLoadMore={loadMore} />
                    ) : null}
                </div>
            </section>
        </>
    );
}
