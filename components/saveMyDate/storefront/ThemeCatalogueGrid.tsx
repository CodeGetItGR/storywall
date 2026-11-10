import type { RefCallback } from 'react';

import { CATALOGUE_GRID } from '@/components/saveMyDate/storefront/storefrontStyles';
import { ThemeCard } from '@/components/saveMyDate/storefront/ThemeCard';
import { ThemeCatalogueMore } from '@/components/saveMyDate/storefront/ThemeCatalogueMore';
import type { CatalogueColumns } from '@/hooks/useThemeCatalogueColumns';
import type { InvitationThemeCardDto } from '@/lib/invitation/themeCatalogue';
import { cn } from '@/lib/utils';

// How many cards fill the first row at the widest layout; those load at once.
const FIRST_ROW = 4;

type ThemeCatalogueGridProps = {
    themes: InvitationThemeCardDto[];
    columns: CatalogueColumns;
    hasMore: boolean;
    onLoadMore: () => void;
    sentinelRef: RefCallback<HTMLDivElement>;
};

// The cards the filters leave, and the way to the next ones.
export function ThemeCatalogueGrid({ themes, columns, hasMore, onLoadMore, sentinelRef }: ThemeCatalogueGridProps) {
    return (
        <>
            {/* Cards */}
            <div className={cn(CATALOGUE_GRID, columns === 2 && 'max-[650px]:grid-cols-2 max-[650px]:gap-3')}>
                {themes.map((theme, index) => (
                    <ThemeCard key={theme.slug} columns={columns} preload={index < FIRST_ROW} theme={theme} />
                ))}
            </div>

            {/* More */}
            {hasMore ? <ThemeCatalogueMore sentinelRef={sentinelRef} onLoadMore={onLoadMore} /> : null}
        </>
    );
}
