'use client';

import { ImagePlus, Send, X } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

import { ComposerModeToggle } from '@/components/composer/ComposerModeToggle';
import { AddSongForm } from '@/components/playlist';
import { Modal } from '@/components/ui/modal';
import type { ComposerController } from '@/hooks/useComposerController';

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
    handlePickPhotos,
    handlePostFilesChange,
    handleRemoveImageClick,
    handleRetryUploadClick,
    images,
    isOpen,
    isPostBusy,
    isSongBusy,
    maxCaptionLength,
    maxImages,
    selectPostMode,
    selectSongMode,
    sizeError,
    songComposerKey,
    submitError,
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
                            className="min-h-36 w-full resize-none rounded-[1.5rem] bg-surface-muted px-5 py-4 text-base leading-relaxed text-ink placeholder:text-ink-faint outline-none transition focus:ring-2 focus:ring-primary/30 sm:min-h-32 sm:text-sm"
                        />
                        <div className="-mt-2 flex items-center justify-between gap-3 text-xs text-ink-faint">
                            <span>{t('photoLimitHint', { count: maxImages })}</span>
                            <span>{t('captionCharacterCount', { count: caption.length, max: maxCaptionLength })}</span>
                        </div>

                        {/* Media previews */}
                        {images.length > 0 && (
                            <div className="grid grid-cols-10 gap-2 flex-nowrap">
                                {images.map((img) => (
                                    <div key={img.key} className="relative aspect-square overflow-hidden rounded-xl bg-surface-muted col-span-2">
                                        <Image src={img.previewUrl} alt="" fill className="object-cover" sizes="200px" />
                                        <button
                                            type="button"
                                            onClick={handleRemoveImageClick}
                                            data-key={img.key}
                                            disabled={img.status === 'uploading'}
                                            aria-label={t('removeImage')}
                                            className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-ink/60 text-white transition-colors hover:bg-ink/80 disabled:cursor-not-allowed disabled:opacity-40"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                        {img.status === 'uploading' && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-ink/40 text-xs text-white">
                                                {t('uploading')}
                                            </div>
                                        )}
                                        {img.status === 'failed' && (
                                            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-destructive/90 px-1.5 py-1 text-[10px] text-white">
                                                <span className="truncate">{img.error ?? t('uploadFailed', { filename: img.file.name })}</span>
                                                <button
                                                    type="button"
                                                    onClick={handleRetryUploadClick}
                                                    disabled={isPostBusy}
                                                    className="shrink-0 underline disabled:cursor-not-allowed disabled:opacity-40"
                                                >
                                                    {t('retry')}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {(sizeError || countError || submitError) && (
                            <p className="text-xs text-destructive">{sizeError ?? countError ?? submitError}</p>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 items-center justify-between">
                            <button
                                type="button"
                                onClick={handlePickPhotos}
                                disabled={!canComposePost || images.length >= maxImages}
                                className="min-w-6 h-auto items-center justify-center gap-2 rounded-full bg-surface-muted text-sm font-medium text-ink-muted transition-colors hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 p-4"
                            >
                                <ImagePlus className="h-4 w-4" />
                            </button>
                            <input
                                ref={fileRef}
                                type="file"
                                accept="image/*"
                                multiple
                                className="sr-only"
                                onChange={handlePostFilesChange}
                                aria-label={t('addPhotos')}
                                tabIndex={-1}
                            />

                            <button
                                type="submit"
                                disabled={!canSubmit}
                                className="flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-full bg-gradient-brand px-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 sm:px-4"
                            >
                                <Send className="h-4 w-4" />
                                {isPostBusy ? t('posting') : t('post')}
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
