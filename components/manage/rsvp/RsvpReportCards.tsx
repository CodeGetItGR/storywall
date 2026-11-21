'use client';

import { useTranslations } from 'next-intl';

import { RsvpReportRow } from '@/components/manage/rsvp/RsvpReportRow';
import { RSVP_REPORT_TYPES } from '@/lib/rsvpReport';

// R1a: the four reports. A swipe row on phones (it bleeds to the screen edge, matching
// the manage content's px-4), 2x2 on desktop.
export function RsvpReportCards({ eventId }: { eventId: string }) {
    const t = useTranslations('ManagePage.rsvpReports');

    return (
        <section className="flex flex-col gap-2" aria-labelledby="rsvp-reports-title">
            {/* Heading */}
            <h2 id="rsvp-reports-title" className="text-[15px] font-bold text-ink">
                {t('title')}
            </h2>

            {/* Cards */}
            <div className="-mr-4 flex snap-x snap-mandatory gap-2 overflow-x-auto pr-4 pb-1 [scrollbar-width:none] lg:mr-0 lg:grid lg:grid-cols-2 lg:overflow-visible lg:pr-0 lg:pb-0">
                {RSVP_REPORT_TYPES.map((reportType) => (
                    <RsvpReportRow
                        key={reportType}
                        eventId={eventId}
                        reportType={reportType}
                        origin="manage"
                        className="w-[200px] shrink-0 snap-start lg:w-auto"
                    />
                ))}
            </div>
        </section>
    );
}
