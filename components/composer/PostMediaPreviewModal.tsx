'use client';

import { Trash2 } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

import { FilterNameOverlay } from '@/components/composer/FilterNameOverlay';
import { PostImageFilterPicker } from '@/components/composer/PostImageFilterPicker';
import { PostPreviewVideo } from '@/components/composer/PostPreviewVideo';
import { Modal } from '@/components/ui/modal';
import type { ComposerController } from '@/hooks/useComposerController';
import { useTransientValue } from '@/hooks/useTransientValue';
import { FILTER_NAME_PILL_DURATION_MS, STORY_FILTER_PRESETS } from '@/lib/story/storyFilters';

interface PostMediaPreviewModalProps {
    controller: ComposerController;
}

export function PostMediaPreviewModal({ controller }: PostMediaPreviewModalProps) {
    const t = useTranslations('ComposerCard');
    const { activeMediaPreview, advanceMediaPreview, closeMediaPreview, handleRemoveImageClick, images, retreatMediaPreview, setImageFilter } =
        controller;
    const { value: appliedFilterName, show: showAppliedFilterName } = useTransientValue<string>(FILTER_NAME_PILL_DURATION_MS);
    const isImage = activeMediaPreview ? !activeMediaPreview.file.type.startsWith('video/') : false;
    const filter = activeMediaPreview ? STORY_FILTER_PRESETS.find((preset) => preset.id === activeMediaPreview.filterId)?.cssFilter : undefined;
    const previewIndex = activeMediaPreview ? images.findIndex((image) => image.key === activeMediaPreview.key) : -1;
    const isLastMedia = previewIndex === images.length - 1;

    function handleFilterChange(filterId: string) {
        setImageFilter(filterId);
        showAppliedFilterName(filterId);
    }

    return (
        <Modal
            open={Boolean(activeMediaPreview)}
            onClose={closeMediaPreview}
            size="full"
            closeLabel={t('closeMediaPreview')}
            ariaLabel={t('mediaPreview')}
            className="bg-black sm:inset-x-auto sm:top-1/2 sm:left-1/2 sm:h-[min(48rem,calc(var(--visual-viewport-height)-3rem))] sm:w-[min(56rem,calc(100vw-4rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl"
        >
            <Modal.Body className="relative overflow-hidden bg-black text-white">
                {activeMediaPreview && (
                    <>
                        {/* Full-screen media preview */}
                        <div className="absolute inset-0 flex items-center justify-center bg-black">
                            {isImage ? (
                                <Image
                                    src={activeMediaPreview.previewUrl}
                                    alt={t('mediaPreview')}
                                    fill
                                    unoptimized
                                    sizes="100vw"
                                    className="object-contain"
                                    style={{ filter }}
                                />
                            ) : (
                                <PostPreviewVideo
                                    key={activeMediaPreview.key}
                                    src={activeMediaPreview.previewUrl}
                                    ariaLabel={t('mediaPreview')}
                                    playLabel={t('playVideo')}
                                    pauseLabel={t('pauseVideo')}
                                />
                            )}
                            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/80" />
                        </div>
                        <FilterNameOverlay name={appliedFilterName ? t(`filters.${appliedFilterName}`) : null} />

                        {/* Preview actions */}
                        <div className="absolute top-4 left-4 z-10 pt-[env(safe-area-inset-top)]">
                            <button
                                type="button"
                                data-key={activeMediaPreview.key}
                                onClick={handleRemoveImageClick}
                                aria-label={t('removeMedia')}
                                className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 backdrop-blur-md disabled:opacity-40"
                            >
                                <Trash2 className="h-4.5 w-4.5" />
                            </button>
                        </div>

                        {/* Preview navigation */}
                        <div className="absolute right-0 bottom-0 left-0 z-10 px-4 pt-16 pb-[max(1rem,env(safe-area-inset-bottom))]">
                            {isImage && <PostImageFilterPicker image={activeMediaPreview} onFilterChange={handleFilterChange} variant="overlay" />}

                            <div className="mt-2 flex items-center justify-between gap-3">
                                {previewIndex > 0 ? (
                                    <button
                                        type="button"
                                        onClick={retreatMediaPreview}
                                        className="min-h-10 px-2 text-sm font-semibold text-white/80 transition-colors hover:text-white"
                                    >
                                        {t('previous')}
                                    </button>
                                ) : (
                                    <span />
                                )}
                                <button
                                    type="button"
                                    onClick={advanceMediaPreview}
                                    className="min-h-10 rounded-full bg-white px-4 text-sm font-semibold text-ink transition-opacity hover:opacity-90"
                                >
                                    {isLastMedia ? t('done') : t('next')}
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </Modal.Body>
        </Modal>
    );
}
