'use client';

import { FileText } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AppLink } from '@/components/ui/AppLink';
import type { RsvpReportType } from '@/lib/api/types';
import { routes } from '@/lib/routes';
import type { RsvpReportOrigin } from '@/lib/rsvpReport';
import { cn } from '@/lib/utils';

type RsvpReportRowProps = { eventId: string; reportType: RsvpReportType; origin: RsvpReportOrigin; className?: string };

// One report as a card: its name and what it holds. Opens the printable report page.
export function RsvpReportRow({ eventId, reportType, origin, className }: RsvpReportRowProps) {
    const t = useTranslations('ManagePage.rsvpReports');

    return (
        <AppLink
            href={routes.events.rsvpReport(eventId, reportType, origin === 'manage' ? undefined : origin)}
            className={cn(
                'flex min-h-[84px] flex-col gap-1 rounded-[18px] bg-primary-light px-3.5 py-3 text-ink transition-colors hover:bg-primary/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                className,
            )}
        >
            {/* Name */}
            <span className="flex items-center gap-2 text-sm font-bold">
                <FileText className="h-4 w-4 shrink-0 text-primary-dark" aria-hidden="true" />
                {t(`types.${reportType}.label`)}
            </span>
            {/* What it holds */}
            <span className="text-xs leading-snug text-ink-muted">{t(`types.${reportType}.description`)}</span>
        </AppLink>
    );
}
