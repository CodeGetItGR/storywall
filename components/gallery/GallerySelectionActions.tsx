'use client';

import { Download } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { createPortal } from 'react-dom';

import { Button } from '@/components/ui/button';
import { useScrolledPastSentinel } from '@/hooks/useScrolledPastSentinel';
import { cn } from '@/lib/utils';

interface GallerySelectionActionsProps {
    selectedCount: number;
    mediaCount: number;
    canDownloadSelected: boolean;
    onSelectAll: () => void;
    onDownloadSelected: () => void;
    onExitSelection: () => void;
}

export function GallerySelectionActions({
    selectedCount,
    mediaCount,
    canDownloadSelected,
    onSelectAll,
    onDownloadSelected,
    onExitSelection,
}: GallerySelectionActionsProps) {
    const t = useTranslations('GalleryPage');
    const { sentinelRef, scrolledPast } = useScrolledPastSentinel();

    const renderActions = (floating: boolean) => (
        <div
            className={cn(
                'mx-auto flex w-full max-w-3xl items-center justify-between gap-2 rounded-2xl',
                floating && 'border border-border/70 bg-background/96 px-3 py-2.5 shadow-[0_10px_28px_rgba(36,31,26,0.12)] backdrop-blur'
            )}
        >
            <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={onExitSelection}
                className="inline-flex rounded-full px-3 text-xs font-semibold text-ink-muted hover:text-ink"
            >
                {t('cancelSelection')}
            </Button>

            <Button
                type="button"
                size="lg"
                onClick={onDownloadSelected}
                disabled={!canDownloadSelected}
                className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-6 text-sm font-semibold text-white shadow-md"
            >
                <Download className="h-4 w-4" />
                {t('downloadSelected', { count: selectedCount })}
            </Button>

            <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onSelectAll}
                disabled={!mediaCount || selectedCount === mediaCount}
                className="inline-flex rounded-full border-border bg-background px-3 text-xs font-semibold text-ink-muted hover:text-ink"
            >
                {t('selectAll')}
            </Button>
        </div>
    );

    return (
        <div className="w-full">
            {/* Scroll sentinel — marks where the bar sits in normal flow */}
            <div ref={sentinelRef} />

            {/* Inline actions — kept mounted while floating so the page keeps its height */}
            <div className={cn(scrolledPast && 'invisible')} aria-hidden={scrolledPast || undefined}>
                {renderActions(false)}
            </div>

            {/* Floating actions — portaled to body: the app shell's <main> is transformed at
                lg+, which would otherwise capture position:fixed and scroll the bar with it. */}
            {scrolledPast && createPortal(<div className="fixed inset-x-0 bottom-0 z-60 px-4 pb-4">{renderActions(true)}</div>, document.body)}
        </div>
    );
}
