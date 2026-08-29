'use client';

import { Loader2, UploadCloud } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';

import { formatBytes } from '@/lib/format';
import { cn } from '@/lib/utils';

interface GalleryUploadSectionProps {
    canUpload: boolean;
    selectedFiles: File[];
    selectedSize: number;
    uploadNotice: string | null;
    maxFiles: number;
    isUploading: boolean;
    onFilesChange: (event: ChangeEvent<HTMLInputElement>) => void;
    onClearSelection: () => void;
    onUpload: () => void;
}

export function GalleryUploadSection({
    canUpload,
    selectedFiles,
    selectedSize,
    uploadNotice,
    maxFiles,
    isUploading,
    onFilesChange,
    onClearSelection,
    onUpload,
}: GalleryUploadSectionProps) {
    const t = useTranslations('GalleryPage');

    return (
        <section className="mb-5 rounded-md border border-border p-4 ">
            {/* Upload header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm font-bold text-ink">{t('uploadTitle')}</p>
                    <p className="mt-1 text-xs leading-relaxed text-ink-muted">{t('uploadHint', { count: maxFiles })}</p>
                </div>
                <label
                    className={cn(
                        'inline-flex cursor-pointer items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-opacity',
                        canUpload ? 'bg-gradient-brand text-white hover:opacity-90' : 'cursor-not-allowed bg-surface-muted text-ink-muted opacity-60'
                    )}
                >
                    <UploadCloud className="h-4 w-4" />
                    {t('chooseFiles')}
                    <input type="file" accept="image/*,video/*" multiple disabled={!canUpload} onChange={onFilesChange} className="sr-only" />
                </label>
            </div>

            {/* Selected files */}
            {selectedFiles.length > 0 && (
                <div className="mt-4 rounded-xl bg-surface-muted/70 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs font-semibold text-ink">
                            {t('selectedSummary', { count: selectedFiles.length, size: formatBytes(selectedSize) })}
                        </p>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={onClearSelection}
                                className="rounded-full px-3 py-1.5 text-xs font-semibold text-ink-muted transition-colors hover:bg-card hover:text-ink"
                            >
                                {t('clear')}
                            </button>
                            <button
                                type="button"
                                onClick={onUpload}
                                disabled={isUploading}
                                className="inline-flex items-center gap-2 rounded-full bg-gradient-brand px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                            >
                                {isUploading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                {t('upload')}
                            </button>
                        </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                        {selectedFiles.map((file) => (
                            <span
                                key={`${file.name}-${file.size}`}
                                className="rounded-full bg-card px-2.5 py-1 text-[11px] font-medium text-ink-muted"
                            >
                                {file.name}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {uploadNotice && <p className="mt-3 text-xs text-ink-muted">{uploadNotice}</p>}
        </section>
    );
}
