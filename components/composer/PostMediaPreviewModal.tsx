'use client';

import { Play, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

import { FilterNameOverlay } from '@/components/composer/FilterNameOverlay';
import { PostImageFilterPicker } from '@/components/composer/PostImageFilterPicker';
import { Modal } from '@/components/ui/modal';
import type { ComposerController } from '@/hooks/useComposerController';
import { STORY_FILTER_PRESETS } from '@/lib/story/storyFilters';

interface PostMediaPreviewModalProps {
    controller: ComposerController;
}

export function PostMediaPreviewModal({ controller }: PostMediaPreviewModalProps) {
    const t = useTranslations('ComposerCard');
    const { activeMediaPreview, closeMediaPreview, handleRemoveImageClick, isPostBusy, setImageFilter } = controller;
    const [appliedFilterName, setAppliedFilterName] = useState<string | null>(null);
    const hideFilterNameTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isImage = activeMediaPreview ? !activeMediaPreview.file.type.startsWith('video/') : false;
    const filter = activeMediaPreview ? STORY_FILTER_PRESETS.find((preset) => preset.id === activeMediaPreview.filterId)?.cssFilter : undefined;

    useEffect(
        () => () => {
            if (hideFilterNameTimeoutRef.current) clearTimeout(hideFilterNameTimeoutRef.current);
        },
        []
    );

    function handleFilterChange(filterId: string) {
        setImageFilter(filterId);
        setAppliedFilterName(filterId);
        if (hideFilterNameTimeoutRef.current) clearTimeout(hideFilterNameTimeoutRef.current);
        hideFilterNameTimeoutRef.current = setTimeout(() => setAppliedFilterName(null), 1500);
    }

    return (
        <Modal
            open={Boolean(activeMediaPreview)}
            onClose={closeMediaPreview}
            size="full"
            closeLabel={t('closeMediaPreview')}
            ariaLabel={t('mediaPreview')}
            className="bg-black"
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
                                <video
                                    src={activeMediaPreview.previewUrl}
                                    controls
                                    playsInline
                                    preload="metadata"
                                    className="h-full w-full object-contain"
                                    aria-label={t('mediaPreview')}
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
                                disabled={isPostBusy || activeMediaPreview.status === 'uploading'}
                                aria-label={t('removeMedia')}
                                className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 backdrop-blur-md disabled:opacity-40"
                            >
                                <Trash2 className="h-4.5 w-4.5" />
                            </button>
                        </div>

                        {/* Image filters */}
                        {isImage && (
                            <div className="absolute right-0 bottom-0 left-0 z-10 px-4 pt-16 pb-[max(1rem,env(safe-area-inset-bottom))]">
                                <PostImageFilterPicker image={activeMediaPreview} onFilterChange={handleFilterChange} variant="overlay" />
                            </div>
                        )}

                        {/* Video marker */}
                        {!isImage && (
                            <span className="pointer-events-none absolute top-1/2 left-1/2 z-10 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white">
                                <Play className="h-4 w-4 fill-white" strokeWidth={0} />
                            </span>
                        )}
                    </>
                )}
            </Modal.Body>
        </Modal>
    );
}
