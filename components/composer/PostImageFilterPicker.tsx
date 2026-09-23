'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';

import { STORY_FILTER_PRESETS } from '@/lib/story/storyFilters';
import { cn } from '@/lib/utils';

interface FilterableImage {
    previewUrl: string;
    filterId: string;
}

interface PostImageFilterPickerProps {
    image: FilterableImage;
    onFilterChange: (filterId: string) => void;
    variant?: 'default' | 'overlay';
}

export function PostImageFilterPicker({ image, onFilterChange, variant = 'default' }: PostImageFilterPickerProps) {
    const t = useTranslations('ComposerCard');

    function handleFilterClick(event: React.MouseEvent<HTMLButtonElement>) {
        const filterId = event.currentTarget.dataset.filterId;
        if (filterId) onFilterChange(filterId);
    }

    return (
        <section aria-label={t('filtersLabel')} className={variant === 'overlay' ? 'mx-auto max-w-xl' : undefined}>
            {/* Filter presets */}
            <div className="flex gap-2 overflow-x-auto px-2 py-2">
                {STORY_FILTER_PRESETS.map((preset) => (
                    <button
                        key={preset.id}
                        type="button"
                        onClick={handleFilterClick}
                        data-filter-id={preset.id}
                        aria-pressed={image.filterId === preset.id}
                        className={cn(
                            'group relative h-14 w-12 shrink-0 overflow-hidden rounded-lg ring-offset-2 transition outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
                            image.filterId === preset.id
                                ? variant === 'overlay'
                                    ? 'ring-2 ring-white'
                                    : 'ring-2 ring-primary'
                                : 'opacity-70 hover:opacity-100',
                        )}
                    >
                        <Image src={image.previewUrl} alt="" fill className="object-cover" sizes="48px" style={{ filter: preset.cssFilter }} />
                    </button>
                ))}
            </div>
        </section>
    );
}
