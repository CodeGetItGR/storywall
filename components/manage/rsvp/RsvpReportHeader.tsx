'use client';

import { useLocale, useTranslations } from 'next-intl';

import type { RsvpReportHeaderDto, RsvpReportType } from '@/lib/api/types';
import { formatReportDate } from '@/lib/rsvpReport';

export function RsvpReportHeader({ header, reportType }: { header: RsvpReportHeaderDto; reportType: RsvpReportType }) {
    const t = useTranslations('ManagePage.rsvpReports');
    const locale = useLocale();
    const date = formatReportDate(locale, header.eventDate);

    return (
        <header>
            <h1 className="text-2xl font-extrabold break-words text-ink">{header.eventTitle}</h1>
            <p className="mt-1 text-sm text-ink-muted">{header.eventTypeName ? `${header.eventTypeName} · ${date}` : date}</p>
            <p className="mt-0.5 text-xs text-ink-faint">{t(`types.${reportType}.label`)}</p>
        </header>
    );
}
