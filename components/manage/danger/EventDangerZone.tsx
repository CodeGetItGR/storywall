'use client';

import { Loader2, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { DangerConsequences } from '@/components/manage/danger/DangerConsequences';
import { DeleteEventIllustration } from '@/components/manage/danger/DeleteEventIllustration';
import type { DangerZoneWishbookLink } from '@/hooks/useDangerZoneDownloads';

type EventDangerZoneProps = {
    showGalleryDownload: boolean;
    wishbook: DangerZoneWishbookLink | null;
    onDownloadAllAction: () => void;
    onDeleteAction: () => void;
    isSendingCode: boolean;
    disabled?: boolean;
    // Shown here while the code sheet is closed, e.g. when the code couldn't be sent.
    error: string | null;
};

export function EventDangerZone({
    showGalleryDownload,
    wishbook,
    onDownloadAllAction,
    onDeleteAction,
    isSendingCode,
    disabled = false,
    error,
}: EventDangerZoneProps) {
    const t = useTranslations('ManagePage.settings.dangerZone');

    return (
        <div className="flex flex-col gap-6">
            {/* Illustration */}
            <DeleteEventIllustration className="mx-auto h-auto w-full max-w-[240px] sm:mx-0" />

            {/* Consequences */}
            <DangerConsequences showGalleryDownload={showGalleryDownload} wishbook={wishbook} onDownloadAllAction={onDownloadAllAction} />

            {/* Delete */}
            <div className="flex flex-col items-start gap-2">
                <button
                    type="button"
                    onClick={onDeleteAction}
                    disabled={disabled || isSendingCode}
                    aria-busy={isSendingCode || undefined}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-rose-300 px-5 text-sm font-semibold text-rose-600 transition-colors hover:border-rose-400 hover:bg-rose-50 focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isSendingCode ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                    )}
                    {t('delete')}
                </button>
                {error && (
                    <p role="alert" className="text-xs text-rose-600">
                        {error}
                    </p>
                )}
            </div>
        </div>
    );
}
