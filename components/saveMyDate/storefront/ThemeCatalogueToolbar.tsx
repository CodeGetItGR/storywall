import { ThemeCatalogueColumnsToggle } from '@/components/saveMyDate/storefront/ThemeCatalogueColumnsToggle';
import { ThemeCatalogueFilters } from '@/components/saveMyDate/storefront/ThemeCatalogueFilters';
import { ThemeCatalogueSearch } from '@/components/saveMyDate/storefront/ThemeCatalogueSearch';
import { ThemeCatalogueSort } from '@/components/saveMyDate/storefront/ThemeCatalogueSort';
import type { CatalogueColumns } from '@/hooks/useThemeCatalogueColumns';
import type { CatalogueEventType, CatalogueFilters, CatalogueSort } from '@/lib/invitation/themeCatalogue';

type ThemeCatalogueToolbarProps = {
    filters: CatalogueFilters;
    columns: CatalogueColumns;
    onEventTypeChange: (eventType: CatalogueEventType | null) => void;
    onQueryChange: (query: string) => void;
    onSortChange: (sort: CatalogueSort) => void;
    onColumnsChange: (columns: CatalogueColumns) => void;
};

// Search, event type, order, and on phones the cards a row. Stacked on phones, two rows on desktop.
export function ThemeCatalogueToolbar({ filters, columns, onEventTypeChange, onQueryChange, onSortChange, onColumnsChange }: ThemeCatalogueToolbarProps) {
    return (
        <div className="mb-6 flex flex-col gap-4 min-[761px]:mb-8">
            {/* Search */}
            <ThemeCatalogueSearch query={filters.query} onQueryChange={onQueryChange} />

            {/* Event type, order and columns */}
            <div className="flex flex-col gap-3 min-[761px]:flex-row min-[761px]:items-center min-[761px]:justify-between">
                <ThemeCatalogueFilters eventType={filters.eventType} onEventTypeChange={onEventTypeChange} />
                <div className="flex items-center justify-between gap-3">
                    <ThemeCatalogueSort sort={filters.sort} onSortChange={onSortChange} />
                    <ThemeCatalogueColumnsToggle columns={columns} onColumnsChange={onColumnsChange} />
                </div>
            </div>
        </div>
    );
}
