'use client';

import { ArrowUp, Download, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface GallerySelectionBarProps {
    visible: boolean;
    selectedCount: number;
    imageCount: number;
    canDownloadSelected: boolean;
    isDownloadingSelection: boolean;
    onSelectAll: () => void;
    onDownloadSelected: () => void;
    onExitSelection: () => void;
    onScrollToTop: () => void;
}

export function GallerySelectionBar({
    visible,
    selectedCount,
    imageCount,
    canDownloadSelected,
    isDownloadingSelection,
    onSelectAll,
    onDownloadSelected,
    onExitSelection,
    onScrollToTop,
}: GallerySelectionBarProps) {
    const t = useTranslations('GalleryPage');

    if (!visible) return null;

    return (
        <div className="fixed inset-x-0 bottom-0 z-[60] px-4 pb-4 lg:static lg:px-0 lg:pb-0">
            {/* Selection actions */}
            <div className="rounded-2xl border border-border/70 bg-background/96 px-3 py-2.5 shadow-[0_10px_28px_rgba(36,31,26,0.12)] backdrop-blur lg:border-0 lg:bg-surface-muted lg:shadow-none">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="w-full text-center text-xs font-semibold text-ink">{t('photosSelected', { count: selectedCount })}</p>
                    <div className="flex flex-wrap items-center gap-2 lg:hidden">
                        <button
                            type="button"
                            onClick={onScrollToTop}
                            aria-label={t('top')}
                            className="inline-flex min-h-9 items-center justify-center rounded-full bg-surface-muted px-3 text-xs font-semibold text-ink-muted transition-colors hover:bg-card hover:text-ink"
                        >
                            <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                            type="button"
                            onClick={onSelectAll}
                            disabled={!imageCount || selectedCount === imageCount}
                            className="min-h-9 rounded-full px-3 text-xs font-semibold text-ink-muted disabled:opacity-50"
                        >
                            {t('selectAll')}
                        </button>
                        <button
                            type="button"
                            onClick={onDownloadSelected}
                            disabled={!canDownloadSelected}
                            className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-ink px-3 text-xs font-semibold text-white disabled:opacity-50"
                        >
                            {isDownloadingSelection ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                            {t('download')}
                        </button>
                        <button type="button" onClick={onExitSelection} className="min-h-9 rounded-full px-3 text-xs font-semibold text-ink-muted">
                            {t('cancelSelection')}
                        </button>
                    </div>
                    <div className="hidden items-center gap-2 lg:flex">
                        <button
                            type="button"
                            onClick={onScrollToTop}
                            aria-label={t('top')}
                            className="inline-flex min-h-9 items-center justify-center rounded-full bg-surface-muted px-3 text-xs font-semibold text-ink-muted transition-colors hover:bg-card hover:text-ink"
                        >
                            <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                            type="button"
                            onClick={onSelectAll}
                            disabled={!imageCount || selectedCount === imageCount}
                            className="min-h-9 rounded-full px-3 text-xs font-semibold text-ink-muted disabled:opacity-50"
                        >
                            {t('selectAll')}
                        </button>
                        <button
                            type="button"
                            onClick={onDownloadSelected}
                            disabled={!canDownloadSelected}
                            className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-ink px-3 text-xs font-semibold text-white disabled:opacity-50"
                        >
                            {isDownloadingSelection ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                            {t('download')}
                        </button>
                        <button type="button" onClick={onExitSelection} className="min-h-9 rounded-full px-3 text-xs font-semibold text-ink-muted">
                            {t('cancelSelection')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
