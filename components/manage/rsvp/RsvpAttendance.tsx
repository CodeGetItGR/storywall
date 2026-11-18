'use client';

import { useTranslations } from 'next-intl';

import { RsvpReportSkeleton } from '@/components/manage/ManageSkeletons';
import { RsvpReportCategories } from '@/components/manage/rsvp/RsvpReportCategories';
import { RsvpReportSessions } from '@/components/manage/rsvp/RsvpReportSessions';
import type { RsvpStatsReport } from '@/hooks/useRsvpStatsReport';

// R1a: attendance by category and people per session, in one block.
// The page's only "couldn't load" message: the tiles show nothing on a failed load.
export function RsvpAttendance({ report, isLoading, isError }: RsvpStatsReport) {
    const t = useTranslations('ManagePage');

    if (isLoading) return <RsvpReportSkeleton />;
    if (isError || !report) return <p className="text-sm text-rose-600">{t('rsvpReport.loadFailed')}</p>;
    if (report.totals.responses === 0) return <p className="text-sm text-ink-muted">{t('rsvpReport.empty')}</p>;

    return (
        <section className="flex flex-col gap-4">
            {/* Categories */}
            <RsvpReportCategories categories={report.categories ?? []} headingClassName="mb-2.5 text-[15px] font-bold text-ink" />

            {/* Sessions */}
            <RsvpReportSessions sessions={report.sessions ?? []} headingClassName="mb-1.5 text-xs font-bold text-ink-muted" />
        </section>
    );
}
