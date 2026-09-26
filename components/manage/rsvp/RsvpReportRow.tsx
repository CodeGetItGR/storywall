'use client';

import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import type { RsvpReportType } from '@/lib/api/types';
import { routes } from '@/lib/routes';
import type { RsvpReportOrigin } from '@/lib/rsvpReport';

export function RsvpReportRow({ eventId, reportType, origin }: { eventId: string; reportType: RsvpReportType; origin: RsvpReportOrigin }) {
    const t = useTranslations('ManagePage.rsvpReports');

    return (
        <Link
            href={routes.events.rsvpReport(eventId, reportType, origin === 'tools' ? 'tools' : undefined)}
            className="flex w-full items-center justify-between gap-3 rounded-xl border border-border px-3.5 py-2.5 text-left transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
            <span className="min-w-0">
                <span className="block text-sm font-medium text-ink">{t(`types.${reportType}.label`)}</span>
                <span className="mt-0.5 block text-xs text-ink-muted">{t(`types.${reportType}.description`)}</span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden="true" />
        </Link>
    );
}
