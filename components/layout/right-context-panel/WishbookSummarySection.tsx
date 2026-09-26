import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import type { WishbookEntryResponseDto } from '@/lib/api/types';
import { routes } from '@/lib/routes';

type WishbookSummarySectionProps = {
    eventId: string;
    entries: WishbookEntryResponseDto[];
    total: number;
};

export function WishbookSummarySection({ eventId, entries, total }: WishbookSummarySectionProps) {
    const t = useTranslations('RightContextPanel.wishbookSummary');

    return (
        <div>
            <Link
                href={routes.events.tools.wishbook(eventId)}
                className="group mb-2 flex items-center gap-1 text-sm font-semibold text-ink hover:text-ink-muted"
            >
                {t('title')}
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink-faint transition-colors group-hover:text-ink-muted" aria-hidden="true" />
            </Link>
            <div className="space-y-2">
                {total === 0 ? (
                    <p className="rounded-md bg-surface-muted/70 px-3 py-2.5 text-sm text-ink-faint">{t('empty')}</p>
                ) : (
                    <>
                        {entries.map((entry) => (
                            <div key={entry.id} className="rounded-md bg-surface-muted/70 px-3 py-2.5">
                                <p className="truncate text-sm font-medium text-ink">{entry.guestName}</p>
                                <p className="mt-0.5 line-clamp-2 text-xs text-ink-muted">{entry.message}</p>
                            </div>
                        ))}
                        <p className="text-xs text-ink-faint">{t('count', { count: total })}</p>
                    </>
                )}
            </div>
        </div>
    );
}
