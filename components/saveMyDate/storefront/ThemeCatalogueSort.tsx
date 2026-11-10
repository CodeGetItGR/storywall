'use client';

import { useTranslations } from 'next-intl';

import { SEGMENT_OFF, SEGMENT_ON, SEGMENTED_TRACK } from '@/components/saveMyDate/storefront/storefrontStyles';
import { CATALOGUE_SORTS, type CatalogueSort } from '@/lib/invitation/themeCatalogue';
import { cn } from '@/lib/utils';

type ThemeCatalogueSortProps = { sort: CatalogueSort; onSortChange: (sort: CatalogueSort) => void };

// The cards' order: the catalogue's own, or by name.
export function ThemeCatalogueSort({ sort, onSortChange }: ThemeCatalogueSortProps) {
    const t = useTranslations('SaveMyDateStorefront.catalogue');

    return (
        <div aria-label={t('sortLabel')} className={SEGMENTED_TRACK} role="group">
            {CATALOGUE_SORTS.map((value) => (
                <SortOption key={value} label={t(`sorts.${value}`)} pressed={sort === value} value={value} onSelect={onSortChange} />
            ))}
        </div>
    );
}

type SortOptionProps = { label: string; pressed: boolean; value: CatalogueSort; onSelect: (value: CatalogueSort) => void };

function SortOption({ label, pressed, value, onSelect }: SortOptionProps) {
    function handleClick() {
        onSelect(value);
    }

    return (
        <button
            aria-pressed={pressed}
            className={cn('min-h-9 rounded-full px-3.5 text-[13px] font-semibold focus-ring transition-colors', pressed ? SEGMENT_ON : SEGMENT_OFF)}
            type="button"
            onClick={handleClick}
        >
            {label}
        </button>
    );
}
