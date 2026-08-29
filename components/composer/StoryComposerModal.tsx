'use client';

import { Camera, Images, Loader2, RefreshCw, Send, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { type ChangeEvent, type MouseEvent, useState } from 'react';

import { StoryPreviewVideo } from '@/components/composer/StoryPreviewVideo';
import { Modal } from '@/components/ui/modal';
import { useStoryCameraController } from '@/hooks/useStoryCameraController';
import type { StoryComposerController } from '@/hooks/useStoryComposerController';
import { cn } from '@/lib/utils';

export function StoryComposerModal({ controller }: { controller: StoryComposerController }) {
    const t = useTranslations('StoryComposer');
    const [cameraActive, setCameraActive] = useState(true);
    const {
        activeItem,
        activeKey,
        addCapturedFile,
        canSubmit,
        close,
        error,
        handleLibraryChange,
        isBusy,
        isOpen,
        items,
        libraryInputRef,
        maxCaptionLength,
        maxItems,
        notice,
        pickFromLibrary,
        removeItem,
        selectItem,
        submit,
        updateCaption,
    } = controller;
    const showCamera = !activeItem || cameraActive;
    const {
        videoRef,
        mode: cameraMode,
        isReady: isCameraReady,
        isRecording,
        error: cameraError,
        setPhotoMode,
        setVideoMode,
        capture,
        switchCamera,
    } = useStoryCameraController(isOpen && showCamera, handleCapturedFile);
    const canAdd = items.length < maxItems && !isBusy;

    function handleRemoveClick(event: MouseEvent<HTMLButtonElement>) {
        const key = event.currentTarget.dataset.storyKey;
        if (key) removeItem(key);
    }
    function handleSelectClick(event: MouseEvent<HTMLButtonElement>) {
        const key = event.currentTarget.dataset.storyKey;
        if (key) selectItem(key);
    }
    function handleCaptionChange(event: ChangeEvent<HTMLTextAreaElement>) {
        updateCaption(event.target.value);
    }
    function handleStoryLibraryChange(event: ChangeEvent<HTMLInputElement>) {
        const hasFiles = Boolean(event.target.files?.length);
        handleLibraryChange(event);
        if (hasFiles) setCameraActive(false);
    }
    function handleCapturedFile(file: File) {
        addCapturedFile(file);
        setCameraActive(false);
    }
    function showCameraView() {
        setCameraActive(true);
    }

    return (
        <Modal open={isOpen} onClose={close} size="full" closeLabel={t('close')} ariaLabel={t('title')} className="bg-black">
            <Modal.Body className="relative overflow-hidden bg-black text-white">
                <form onSubmit={submit} className="relative h-full min-h-0">
                    {activeItem && !showCamera ? (
                        <>
                            {/* Full-screen story preview */}
                            <div className="absolute inset-0 flex items-center justify-center bg-black">
                                {activeItem.file.type.startsWith('video/') ? (
                                    <StoryPreviewVideo key={activeItem.previewUrl} src={activeItem.previewUrl} />
                                ) : (
                                    <Image
                                        src={activeItem.previewUrl}
                                        alt={t('previewAlt')}
                                        fill
                                        className="object-contain"
                                        sizes="100vw"
                                        unoptimized
                                    />
                                )}
                                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/80" />
                                {(activeItem.status === 'uploading' || activeItem.status === 'posting') && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/45">
                                        <Loader2 className="h-7 w-7 animate-spin" />
                                    </div>
                                )}
                            </div>

                            {/* Preview toolbar */}
                            <div className="absolute top-4 right-14 left-4 z-10 flex items-center gap-2 pt-[env(safe-area-inset-top)]">
                                <button
                                    type="button"
                                    onClick={showCameraView}
                                    disabled={!canAdd}
                                    aria-label={t('camera')}
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/50 backdrop-blur-md disabled:opacity-40"
                                >
                                    <Camera className="h-5 w-5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={pickFromLibrary}
                                    disabled={!canAdd}
                                    aria-label={t('library')}
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/50 backdrop-blur-md disabled:opacity-40"
                                >
                                    <Images className="h-5 w-5" />
                                </button>
                                {items.length > 1 && (
                                    <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto px-1 py-1 no-scrollbar" aria-label={t('storyList')}>
                                        {items.map((item, index) => (
                                            <button
                                                key={item.key}
                                                type="button"
                                                onClick={handleSelectClick}
                                                data-story-key={item.key}
                                                aria-label={t('selectStory', { number: index + 1 })}
                                                aria-current={item.key === activeKey}
                                                className={cn(
                                                    'relative h-12 w-9 shrink-0 overflow-hidden rounded-md bg-black ring-2 ring-white/30 transition',
                                                    item.key === activeKey && 'ring-white'
                                                )}
                                            >
                                                {item.file.type.startsWith('video/') ? (
                                                    <video
                                                        src={item.previewUrl}
                                                        muted
                                                        playsInline
                                                        preload="metadata"
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    <Image src={item.previewUrl} alt="" fill className="object-cover" sizes="36px" unoptimized />
                                                )}
                                                {item.status === 'failed' && <span className="absolute inset-x-0 bottom-0 h-1.5 bg-destructive" />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <button
                                    type="button"
                                    onClick={handleRemoveClick}
                                    data-story-key={activeItem.key}
                                    disabled={isBusy}
                                    aria-label={t('remove')}
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/50 backdrop-blur-md disabled:opacity-40"
                                >
                                    <Trash2 className="h-4.5 w-4.5" />
                                </button>
                            </div>

                            {/* Per-story details and submit */}
                            <div className="absolute right-0 bottom-0 left-0 z-10 px-4 pt-16 pb-[max(1rem,env(safe-area-inset-bottom))]">
                                <div className="mx-auto max-w-xl space-y-2">
                                    <div className="relative">
                                        <textarea
                                            value={activeItem.caption}
                                            onChange={handleCaptionChange}
                                            disabled={isBusy}
                                            rows={1}
                                            maxLength={maxCaptionLength}
                                            aria-label={t('caption')}
                                            placeholder={t('captionPlaceholder')}
                                            className="min-h-11 w-full resize-none rounded-lg bg-black/50 px-4 py-3 pr-16 text-sm text-white placeholder:text-white/60 outline-none backdrop-blur-md focus:ring-2 focus:ring-white/60 disabled:opacity-50"
                                        />
                                        <span className="absolute right-3 bottom-2 text-[10px] text-white/50">
                                            {activeItem.caption.length}/{maxCaptionLength}
                                        </span>
                                    </div>
                                    {(activeItem.error || error || notice) && (
                                        <p
                                            className={cn(
                                                'rounded-md bg-black/55 px-3 py-2 text-xs backdrop-blur-md',
                                                activeItem.error || error ? 'text-red-200' : 'text-white/75'
                                            )}
                                        >
                                            {activeItem.error ?? error ?? notice}
                                        </p>
                                    )}
                                    <button
                                        type="submit"
                                        disabled={!canSubmit}
                                        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-brand px-4 text-sm font-semibold text-white disabled:opacity-40"
                                    >
                                        {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                        {isBusy ? t('posting') : t('post', { count: items.length })}
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Live camera viewfinder */}
                            <video
                                ref={videoRef}
                                muted
                                playsInline
                                autoPlay
                                className="absolute inset-0 h-full w-full object-cover"
                                aria-label={t('cameraPreview')}
                            />
                            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/65" />

                            {/* Camera fallback */}
                            {cameraError && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
                                    <Camera className="h-9 w-9 text-white/60" />
                                    <p className="mt-3 max-w-xs text-sm text-white/85">
                                        {t(cameraError === 'permission' ? 'cameraPermission' : 'cameraUnavailable')}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={pickFromLibrary}
                                        className="mt-5 flex min-h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-black"
                                    >
                                        <Images className="h-4 w-4" />
                                        {t('openLibrary')}
                                    </button>
                                </div>
                            )}

                            {/* Camera controls */}
                            {!cameraError && (
                                <div className="absolute right-0 bottom-0 left-0 z-10 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
                                    <div className="mb-5 flex items-center justify-center gap-5 text-xs font-semibold">
                                        <button
                                            type="button"
                                            onClick={setPhotoMode}
                                            className={cameraMode === 'photo' ? 'text-white' : 'text-white/50'}
                                        >
                                            {t('photoMode')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={setVideoMode}
                                            className={cameraMode === 'video' ? 'text-white' : 'text-white/50'}
                                        >
                                            {t('videoMode')}
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-3 items-center px-8">
                                        <button
                                            type="button"
                                            onClick={pickFromLibrary}
                                            aria-label={t('library')}
                                            className="flex h-11 w-11 items-center justify-center justify-self-start rounded-full bg-black/45 backdrop-blur-md"
                                        >
                                            <Images className="h-5 w-5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={capture}
                                            disabled={!isCameraReady}
                                            aria-label={
                                                isRecording ? t('stopRecording') : cameraMode === 'photo' ? t('capturePhoto') : t('startRecording')
                                            }
                                            className={cn(
                                                'flex h-19 w-19 items-center justify-center justify-self-center rounded-full border-4 border-white bg-white/20 transition disabled:opacity-40',
                                                isRecording && 'border-red-500 bg-red-500/25'
                                            )}
                                        >
                                            <span
                                                className={cn(
                                                    'h-15 w-15 rounded-full bg-white transition-all',
                                                    cameraMode === 'video' && 'h-11 w-11 bg-red-500',
                                                    isRecording && 'h-7 w-7 rounded-md'
                                                )}
                                            />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={switchCamera}
                                            aria-label={t('switchCamera')}
                                            className="flex h-11 w-11 items-center justify-center justify-self-end rounded-full bg-black/45 backdrop-blur-md"
                                        >
                                            <RefreshCw className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                    <input
                        ref={libraryInputRef}
                        type="file"
                        accept="image/*,video/*"
                        multiple
                        className="sr-only"
                        onChange={handleStoryLibraryChange}
                        tabIndex={-1}
                    />
                </form>
            </Modal.Body>
        </Modal>
    );
}
