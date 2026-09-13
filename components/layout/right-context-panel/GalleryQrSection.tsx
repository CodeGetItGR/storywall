import { ChevronRight, QrCode } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import type { QrLinkResponseDto } from '@/lib/api/types';
import { routes } from '@/lib/routes';

type GalleryQrSectionProps = {
    eventId: string;
    qrLink: QrLinkResponseDto | null;
};

export function GalleryQrSection({ eventId, qrLink }: GalleryQrSectionProps) {
    const t = useTranslations('RightContextPanel.galleryQr');

    return (
        <div>
            <Link
                href={routes.events.tools.galleryQr(eventId)}
                className="group mb-2 flex items-center gap-1 text-sm font-semibold text-ink hover:text-ink-muted"
            >
                {t('title')}
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink-faint transition-colors group-hover:text-ink-muted" aria-hidden="true" />
            </Link>
            <div className="flex items-center gap-2 rounded-xl bg-surface-muted/70 px-3 py-2.5">
                <QrCode className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden="true" />
                <p className="min-w-0 truncate text-xs text-ink-muted">{qrLink ? t('body') : t('missing')}</p>
            </div>
        </div>
    );
}
