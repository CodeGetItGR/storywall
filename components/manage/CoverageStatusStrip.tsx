'use client';

import { Download, Images } from 'lucide-react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';

import type { EventScheduleDto } from '@/lib/api/types';
import { formatDate } from '@/lib/datetime';
import { getCoverageStatus } from '@/lib/eventCoverage';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

/**
 * One line telling the host where the gallery sits in its coverage window.
 * Renders nothing while the window is not pinned yet (DRAFT).
 */
export function CoverageStatusStrip({ eventId, schedule }: { eventId: string; schedule: EventScheduleDto }) {
    const t = useTranslations('ManagePage.coverage');
    const locale = useLocale();
    const status = getCoverageStatus(schedule);
    if (!status) return null;

    const closesOn = formatDate(locale, status.coverageEndsAt, { dateStyle: 'medium' });
    const isClosing = status.phase === 'closing' || status.phase === 'ended';
    const label =
        status.phase === 'open'
            ? t('openUntil', { date: closesOn })
            : status.phase === 'closing'
              ? t('closingIn', { days: status.daysUntilEnd })
              : t('ended', { date: closesOn });

    return (
        <div
            className={cn(
                'flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-md px-3.5 py-2.5 text-sm',
                isClosing ? 'bg-amber-50 text-amber-900' : 'bg-surface-muted text-ink',
            )}
        >
            <span className="flex min-w-0 items-center gap-2 font-semibold">
                <Images className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden="true" />
                {label}
            </span>
            {/* Download CTA (final month) */}
            {isClosing && (
                <Link
                    href={routes.events.tools.gallery(eventId)}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-primary px-3.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                >
                    <Download className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('download')}
                </Link>
            )}
        </div>
    );
}
