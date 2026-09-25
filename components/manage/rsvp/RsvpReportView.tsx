'use client';

import type { RsvpReportDto } from '@/lib/api/types';

import { RsvpReportCategories } from './RsvpReportCategories';
import { RsvpReportGroups } from './RsvpReportGroups';
import { RsvpReportHeader } from './RsvpReportHeader';
import { RsvpReportSessions } from './RsvpReportSessions';
import { RsvpReportTiles } from './RsvpReportTiles';

// The report as the host sees it on screen and on paper. Every number is the
// backend's: this only draws the sections the report type fills in.
export function RsvpReportView({ report }: { report: RsvpReportDto }) {
    return (
        <div className="flex flex-col gap-8">
            {/* Header */}
            <RsvpReportHeader header={report.header} reportType={report.reportType} />

            {/* Tiles */}
            <RsvpReportTiles totals={report.totals} />

            {/* Categories */}
            {report.categories && <RsvpReportCategories categories={report.categories} />}

            {/* Sessions */}
            {report.sessions && <RsvpReportSessions sessions={report.sessions} />}

            {/* Guest list */}
            {report.groups && <RsvpReportGroups groups={report.groups} />}
        </div>
    );
}
