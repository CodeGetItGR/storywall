'use client';

import { Download, Loader2, X } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

import type { MediaResponseDto } from '@/lib/api/types';

interface GalleryViewerProps {
    media: MediaResponseDto | null;
    keepsOriginals: boolean;
    originalError: string | null;
    isDownloadingOriginal: boolean;
    onClose: () => void;
    onDownloadOriginal: () => void;
}

export function GalleryViewer({
    media,
    keepsOriginals,
    originalError,
    isDownloadingOriginal,
    onClose,
    onDownloadOriginal,
}: GalleryViewerProps) {
    const t = useTranslations('GalleryPage');

    if (!media) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4" role="dialog" aria-modal="true" aria-label={t('viewerLabel')}>
            {/* Viewer close button */}
            <button type="button" onClick={onClose} className="absolute right-4 top-4 rounded-full bg-black/50 p-2 text-white" aria-label={t('closeViewer')}>
                <X className="h-5 w-5" />
            </button>
            <div className="flex max-h-full max-w-5xl flex-col items-center gap-3">
                {/* Viewer image */}
                <div className="relative h-[70vh] w-[90vw] max-w-5xl">
                    <Image src={media.mediaUrl} alt={media.originalFilename} fill sizes="90vw" className="object-contain" />
                </div>
                {/* Viewer actions */}
                {keepsOriginals && (
                    <button
                        type="button"
                        onClick={onDownloadOriginal}
                        disabled={isDownloadingOriginal}
                        className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink disabled:opacity-50"
                    >
                        {isDownloadingOriginal ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                        {t('downloadOriginal')}
                    </button>
                )}
                {originalError && <p className="text-xs text-rose-200">{originalError}</p>}
            </div>
        </div>
    );
}
