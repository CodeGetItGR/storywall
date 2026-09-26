import { ChevronRight, Image as ImageIcon, Video } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import type { MediaArchiveManifestDto } from '@/lib/api/types';
import { formatCount } from '@/lib/format';
import { routes } from '@/lib/routes';

type MediaSummarySectionProps = {
    eventId: string;
    summary: MediaArchiveManifestDto;
};

export function MediaSummarySection({ eventId, summary }: MediaSummarySectionProps) {
    const t = useTranslations('RightContextPanel.mediaSummary');

    return (
        <div>
            <Link
                href={routes.events.tools.gallery(eventId)}
                className="group mb-2 flex items-center gap-1 text-sm font-semibold text-ink hover:text-ink-muted"
            >
                {t('title')}
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink-faint transition-colors group-hover:text-ink-muted" aria-hidden="true" />
            </Link>
            <div className="flex gap-2">
                <div className="flex flex-1 items-center justify-center gap-2 rounded-md bg-surface-muted/70 px-3 py-2.5">
                    <ImageIcon className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden="true" />
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink">{formatCount(summary.photoCount)}</p>
                    </div>
                </div>
                <div className="flex flex-1 items-center justify-center gap-2 rounded-md bg-surface-muted/70 px-3 py-2.5">
                    <Video className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden="true" />
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink">{formatCount(summary.videoCount)}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
