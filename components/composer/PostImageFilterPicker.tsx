'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';

import type { PendingImage } from '@/hooks/useComposerController';
import { STORY_FILTER_PRESETS } from '@/lib/story/storyFilters';
import { cn } from '@/lib/utils';

interface PostImageFilterPickerProps {
    image: PendingImage;
    onFilterChange: (filterId: string) => void;
}

export function PostImageFilterPicker({ image, onFilterChange }: PostImageFilterPickerProps) {
    const t = useTranslations('ComposerCard');

    function handleFilterClick(event: React.MouseEvent<HTMLButtonElement>) {
        const filterId = event.currentTarget.dataset.filterId;
        if (filterId) onFilterChange(filterId);
    }

    return (
        <section aria-label={t('filtersLabel')}>
            {/* Filter presets */}
            <div className="flex gap-2 overflow-x-auto pb-1">
                {STORY_FILTER_PRESETS.map((preset) => (
                    <button
                        key={preset.id}
                        type="button"
                        onClick={handleFilterClick}
                        data-filter-id={preset.id}
                        aria-pressed={image.filterId === preset.id}
                        className={cn(
                            'group relative h-14 w-12 shrink-0 overflow-hidden rounded-lg outline-none ring-offset-2 transition focus-visible:ring-2 focus-visible:ring-primary/60',
                            image.filterId === preset.id ? 'ring-2 ring-primary' : 'opacity-70 hover:opacity-100'
                        )}
                    >
                        <Image src={image.previewUrl} alt="" fill className="object-cover" sizes="48px" style={{ filter: preset.cssFilter }} />
                        <span className="absolute inset-x-0 bottom-0 bg-ink/65 px-1 py-0.5 text-[9px] font-medium text-white">
                            {t(`filters.${preset.id}`)}
                        </span>
                    </button>
                ))}
            </div>
        </section>
    );
}
