'use client';

import { Play, Send, X } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

import { AddImageButton } from '@/components/composer/AddImageButton';
import { ComposerModeToggle } from '@/components/composer/ComposerModeToggle';
import { AddSongForm } from '@/components/playlist';
import { Modal } from '@/components/ui/modal';
import type { ComposerController } from '@/hooks/useComposerController';
import { STORY_FILTER_PRESETS } from '@/lib/story/storyFilters';
import { cn } from '@/lib/utils';

export function ComposerModal({
    canComposePost,
    canComposeSong,
    canSubmit,
    caption,
    closeComposer,
    composerMode,
    countError,
    fileRef,
    handleCaptionChange,
    handleImageFilterSelection,
    handlePickPhotos,
    handlePostFilesChange,
    handleRemoveImageClick,
    images,
    isOpen,
    isSongBusy,
    maxCaptionLength,
    maxImages,
    selectPostMode,
    selectSongMode,
    selectedImageForFilter,
    sizeError,
    songComposerKey,
    submitPlaylistSuggestion,
    submitPost,
    textareaRef,
}: ComposerController) {
    const t = useTranslations('ComposerCard');

    return (
        <Modal
            open={isOpen}
            onClose={closeComposer}
            size="sm"
            variant="sheet"
            closeLabel={t('cancel')}
            className="w-screen max-w-none pb-[env(safe-area-inset-bottom)] sm:w-[calc(100vw-1rem)] sm:max-w-xl md:max-w-2xl"
        >
            <Modal.Body className="px-3 py-4 sm:p-5">
                {/* Mode tabs */}
                <div className="mb-4 flex flex-wrap items-center gap-2 pr-10">
                    <ComposerModeToggle mode="post" currentMode={composerMode} onSelectAction={selectPostMode} />
                    <ComposerModeToggle mode="song" currentMode={composerMode} onSelectAction={selectSongMode} disabled={!canComposeSong} />
                </div>

                {/* Post form */}
                <div hidden={composerMode !== 'post'}>
                    <form onSubmit={submitPost} className="flex flex-col gap-4">
                        <textarea
                            ref={textareaRef}
                            value={caption}
                            onChange={handleCaptionChange}
                            placeholder={t('captionPlaceholder')}
                            aria-label={t('captionAriaLabel')}
                            rows={4}
                            maxLength={maxCaptionLength}
                            className="min-h-36 w-full resize-none rounded-[1.5rem] bg-surface-muted px-5 py-4 text-base leading-relaxed text-ink transition outline-none placeholder:text-ink-faint focus:ring-2 focus:ring-primary/30 sm:min-h-32 sm:text-sm"
                        />
                        <div className="-mt-2 flex items-center justify-between gap-3 text-xs text-ink-faint">
                            <span>{t('mediaLimitHint', { count: maxImages })}</span>
                            <span>{t('captionCharacterCount', { count: caption.length, max: maxCaptionLength })}</span>
                        </div>

                        {/* Media previews */}
                        {images.length > 0 && (
                            <div className="grid grid-cols-10 flex-nowrap gap-2">
                                {images.map((img) => {
                                    const isVideo = img.file.type.startsWith('video/');
                                    return (
                                        <div
                                            key={img.key}
                                            className={cn(
                                                'relative col-span-2 aspect-square overflow-hidden rounded-xl bg-surface-muted',
                                                selectedImageForFilter?.key === img.key && 'ring-2 ring-primary ring-offset-2',
                                            )}
                                        >
                                            {isVideo ? (
                                                <>
                                                    <video
                                                        src={img.previewUrl}
                                                        muted
                                                        playsInline
                                                        preload="metadata"
                                                        className="h-full w-full object-cover"
                                                    />
                                                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white">
                                                            <Play className="h-3.5 w-3.5 fill-white" strokeWidth={0} />
                                                        </span>
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={handleImageFilterSelection}
                                                        data-key={img.key}
                                                        aria-label={t('mediaPreview')}
                                                        className="absolute inset-0 z-10 outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                                                    />
                                                </>
                                            ) : (
                                                <>
                                                    <Image
                                                        src={img.previewUrl}
                                                        alt=""
                                                        fill
                                                        className="object-cover"
                                                        sizes="200px"
                                                        style={{
                                                            filter: STORY_FILTER_PRESETS.find((preset) => preset.id === img.filterId)?.cssFilter,
                                                        }}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={handleImageFilterSelection}
                                                        data-key={img.key}
                                                        aria-pressed={selectedImageForFilter?.key === img.key}
                                                        aria-label={t('imageSelected')}
                                                        className="absolute inset-0 z-10 outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                                                    />
                                                </>
                                            )}
                                            <button
                                                type="button"
                                                onClick={handleRemoveImageClick}
                                                data-key={img.key}
                                                aria-label={t('removeMedia')}
                                                className="absolute top-1.5 right-1.5 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-ink/60 text-white transition-colors hover:bg-ink/80"
                                            >
                                                <X className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {(sizeError || countError) && <p className="text-xs text-destructive">{sizeError ?? countError}</p>}

                        {/* Actions */}
                        <div className="flex items-center justify-between gap-2">
                            <AddImageButton
                                aria-label={t('addMedia')}
                                onClick={handlePickPhotos}
                                disabled={!canComposePost || images.length >= maxImages}
                            />
                            <input
                                ref={fileRef}
                                type="file"
                                accept="image/*,video/*"
                                multiple
                                className="sr-only"
                                onChange={handlePostFilesChange}
                                aria-label={t('addMedia')}
                                tabIndex={-1}
                            />

                            <button
                                type="submit"
                                disabled={!canSubmit}
                                className="flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-full px-3 text-sm font-semibold text-white transition-opacity bg-gradient-brand hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 sm:px-4"
                            >
                                <Send className="h-4 w-4" />
                                {t('post')}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Song form */}
                <div hidden={composerMode !== 'song'}>
                    <AddSongForm
                        key={songComposerKey}
                        isSubmitting={isSongBusy}
                        canSubmit={canComposeSong}
                        onSubmitAction={submitPlaylistSuggestion}
                        compact
                    />
                </div>
            </Modal.Body>
        </Modal>
    );
}
