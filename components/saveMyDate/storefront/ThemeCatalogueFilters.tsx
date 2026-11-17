'use client';

import { useTranslations } from 'next-intl';

import { CHIP, CHIP_IDLE } from '@/components/saveMyDate/storefront/storefrontStyles';
import { CATALOGUE_EVENT_TYPES, type CatalogueEventType } from '@/lib/invitation/themeCatalogue';
import { cn } from '@/lib/utils';

type ThemeCatalogueFiltersProps = {
    eventType: CatalogueEventType | null;
    onEventTypeChange: (eventType: CatalogueEventType | null) => void;
};

// One chip per event type, and one for all of them.
export function ThemeCatalogueFilters({ eventType, onEventTypeChange }: ThemeCatalogueFiltersProps) {
    const t = useTranslations('SaveMyDateStorefront');
    const options: { value: CatalogueEventType | null; label: string }[] = [
        { value: null, label: t('catalogue.all') },
        ...CATALOGUE_EVENT_TYPES.map((value) => ({ value, label: t(`eventTypes.${value}`) })),
    ];

    return (
        <div aria-label={t('catalogue.filterLabel')} className="flex flex-wrap gap-2" role="group">
            {options.map((option) => (
                <FilterChip
                    key={option.value ?? 'all'}
                    label={option.label}
                    pressed={eventType === option.value}
                    value={option.value}
                    onSelect={onEventTypeChange}
                />
            ))}
        </div>
    );
}

type FilterChipProps = {
    label: string;
    pressed: boolean;
    value: CatalogueEventType | null;
    onSelect: (value: CatalogueEventType | null) => void;
};

function FilterChip({ label, pressed, value, onSelect }: FilterChipProps) {
    function handleClick() {
        onSelect(value);
    }

    return (
        <button aria-pressed={pressed} className={cn(CHIP, !pressed && CHIP_IDLE)} type="button" onClick={handleClick}>
            {label}
        </button>
    );
}
