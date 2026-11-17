'use client';

import { Columns2, type LucideIcon, RectangleVertical } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { SEGMENT_OFF, SEGMENT_ON, SEGMENTED_TRACK } from '@/components/saveMyDate/storefront/storefrontStyles';
import type { CatalogueColumns } from '@/hooks/useThemeCatalogueColumns';
import { cn } from '@/lib/utils';

type ThemeCatalogueColumnsToggleProps = { columns: CatalogueColumns; onColumnsChange: (columns: CatalogueColumns) => void };

// Phones only: one or two cards a row.
export function ThemeCatalogueColumnsToggle({ columns, onColumnsChange }: ThemeCatalogueColumnsToggleProps) {
    const t = useTranslations('SaveMyDateStorefront.catalogue');

    return (
        <div className={cn(SEGMENTED_TRACK, 'min-[651px]:hidden')}>
            <ColumnsOption icon={RectangleVertical} label={t('oneColumn')} pressed={columns === 1} value={1} onSelect={onColumnsChange} />
            <ColumnsOption icon={Columns2} label={t('twoColumns')} pressed={columns === 2} value={2} onSelect={onColumnsChange} />
        </div>
    );
}

type ColumnsOptionProps = {
    icon: LucideIcon;
    label: string;
    pressed: boolean;
    value: CatalogueColumns;
    onSelect: (value: CatalogueColumns) => void;
};

function ColumnsOption({ icon: Icon, label, pressed, value, onSelect }: ColumnsOptionProps) {
    function handleClick() {
        onSelect(value);
    }

    return (
        <button
            aria-label={label}
            aria-pressed={pressed}
            className={cn('grid size-9 place-items-center rounded-full focus-ring transition-colors', pressed ? SEGMENT_ON : SEGMENT_OFF)}
            title={label}
            type="button"
            onClick={handleClick}
        >
            <Icon aria-hidden className="size-4" />
        </button>
    );
}
