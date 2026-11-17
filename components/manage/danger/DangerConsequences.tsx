'use client';

import { BookHeart, Download, type LucideIcon, TriangleAlert, UserX } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { AppLink } from '@/components/ui/AppLink';
import type { DangerZoneWishbookLink } from '@/hooks/useDangerZoneDownloads';

type DangerConsequencesProps = {
    showGalleryDownload: boolean;
    wishbook: DangerZoneWishbookLink | null;
    onDownloadAllAction: () => void;
};

const actionClass =
    'inline-flex min-h-10 items-center gap-1.5 rounded-full bg-surface-muted px-4 text-sm font-semibold text-ink transition-colors hover:bg-border/60 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none';

// What deleting the event does, one line each.
export function DangerConsequences({ showGalleryDownload, wishbook, onDownloadAllAction }: DangerConsequencesProps) {
    const t = useTranslations('ManagePage.settings.dangerZone.consequences');
    const tGallery = useTranslations('GalleryPage');
    const hasActions = showGalleryDownload || wishbook !== null;

    return (
        <ul className="flex flex-col gap-4">
            {/* Guests */}
            <ConsequenceLine icon={UserX}>{t('guestsLoseAccess')}</ConsequenceLine>

            {/* Still available */}
            <ConsequenceLine icon={Download}>
                {t('stillAvailable')}
                {hasActions && (
                    <span className="mt-2.5 flex flex-wrap gap-2">
                        {showGalleryDownload && (
                            <button type="button" onClick={onDownloadAllAction} className={actionClass}>
                                <Download className="h-4 w-4" aria-hidden="true" />
                                {tGallery('downloadGallery')}
                            </button>
                        )}
                        {wishbook && (
                            <AppLink href={wishbook.href} className={actionClass}>
                                <BookHeart className="h-4 w-4" aria-hidden="true" />
                                {wishbook.label}
                            </AppLink>
                        )}
                    </span>
                )}
            </ConsequenceLine>

            {/* Cannot be undone */}
            <ConsequenceLine icon={TriangleAlert}>{t('cannotUndo')}</ConsequenceLine>
        </ul>
    );
}

function ConsequenceLine({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
    return (
        <li className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1 pt-1.5 text-sm leading-relaxed text-ink">{children}</span>
        </li>
    );
}
