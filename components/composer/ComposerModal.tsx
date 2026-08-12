'use client';

import { ImagePlus, Music3, Send, X } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

import { AddSongForm } from '@/components/playlist';
import Avatar from '@/components/ui/avatar';
import { Modal } from '@/components/ui/modal';

import type { ComposerController } from '@/hooks/useComposerController';

function ComposerModeToggle({
    mode,
    currentMode,
    onSelect,
    disabled,
}: {
    mode: 'post' | 'song';
    currentMode: 'post' | 'song';
    onSelect: () => void;
    disabled?: boolean;
}) {
    const t = useTranslations('ComposerCard');
    const active = currentMode === mode;
    const label = mode === 'post' ? t('post') : t('music');

    return (
        <button
            type="button"
            onClick={onSelect}
            aria-pressed={active}
            disabled={disabled}
            className={
                `inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ` +
                (active ? (mode === 'post' ? 'bg-ink text-white' : 'bg-primary-light text-primary-dark') : 'bg-surface-muted text-ink-muted hover:bg-surface-muted/80')
            }
        >
            {mode === 'song' && <Music3 className="h-3.5 w-3.5" />}
            {label}
        </button>
    );
}

export function ComposerModal({ controller }: { controller: ComposerController }) {
    const t = useTranslations('ComposerCard');

    return (
        <Modal
            open={controller.isOpen}
            onClose={controller.closeComposer}
            size="sm"
            variant="sheet"
            closeLabel={t('cancel')}
            className="pb-[env(safe-area-inset-bottom)]"
        >
            <Modal.Body className="p-4">
                <div className="mb-4 flex items-center gap-2 pr-10">
                    <ComposerModeToggle mode="post" currentMode={controller.composerMode} onSelect={controller.selectPostMode} />
                    <ComposerModeToggle mode="song" currentMode={controller.composerMode} onSelect={controller.selectSongMode} disabled={!controller.canComposeSong} />
                </div>

                <div hidden={controller.composerMode !== 'post'}>
                    <form onSubmit={controller.submitPost} className="flex flex-col gap-4">
                        <div className="flex items-start gap-3">
                            <Avatar initials={controller.initials} size="md" alt={controller.memberName || undefined} />
                            <textarea
                                ref={controller.textareaRef}
                                value={controller.caption}
                                onChange={controller.handleCaptionChange}
                                placeholder={t('captionPlaceholder')}
                                aria-label={t('captionAriaLabel')}
                                rows={3}
                                className="flex-1 resize-none rounded-2xl bg-surface-muted px-4 py-3 text-sm leading-relaxed text-ink placeholder:text-ink-faint outline-none transition focus:ring-2 focus:ring-primary/30"
                            />
                        </div>

                        {controller.images.length > 0 && (
                            <div className="grid grid-cols-3 gap-2">
                                {controller.images.map((img) => (
                                    <div key={img.key} className="relative aspect-square overflow-hidden rounded-xl bg-surface-muted">
                                        <Image src={img.previewUrl} alt="" fill className="object-cover" sizes="200px" />
                                        <button
                                            type="button"
                                            onClick={controller.handleRemoveImageClick}
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
                                                    onClick={controller.handleRetryUploadClick}
                                                    disabled={controller.isPostBusy}
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

                        {(controller.sizeError || controller.countError || controller.submitError) && (
                            <p className="text-xs text-destructive">{controller.sizeError ?? controller.countError ?? controller.submitError}</p>
                        )}

                        <div className="flex items-center justify-between">
                            <button
                                type="button"
                                onClick={controller.handlePickPhotos}
                                disabled={!controller.canComposePost || controller.images.length >= controller.maxImages}
                                className="flex items-center gap-2 text-sm font-medium text-ink-muted transition-colors hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <ImagePlus className="h-4 w-4" />
                                {t('addPhotos')}
                            </button>
                            <input
                                ref={controller.fileRef}
                                type="file"
                                accept="image/*"
                                multiple
                                className="sr-only"
                                onChange={controller.handlePostFilesChange}
                                aria-label={t('addPhotos')}
                                tabIndex={-1}
                            />

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={controller.closeComposer}
                                    disabled={controller.isPostBusy}
                                    className="rounded-full px-4 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    {t('cancel')}
                                </button>
                                <button
                                    type="submit"
                                    disabled={!controller.canSubmit}
                                    className="flex items-center gap-2 rounded-full bg-gradient-brand px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    <Send className="h-4 w-4" />
                                    {controller.isPostBusy ? t('posting') : t('post')}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>

                <div hidden={controller.composerMode !== 'song'}>
                    <AddSongForm
                        key={controller.songComposerKey}
                        isSubmitting={controller.isSongBusy}
                        canSubmit={controller.canComposeSong}
                        onSubmit={controller.submitPlaylistSuggestion}
                        compact
                    />
                </div>
            </Modal.Body>
        </Modal>
    );
}
