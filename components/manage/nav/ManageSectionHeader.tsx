// components/manage/nav/ManageSectionHeader.tsx
'use client';

import { ChevronLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ManageNavLink } from '@/components/manage/nav/ManageNavLink';
import type { ManageSection } from '@/lib/manageSections';

/** Header B (small screens): an easy-to-spot way back to the Overview, and this page's title. */
export function ManageSectionHeader({
    eventId,
    title,
    onSelectSection,
}: {
    eventId: string;
    title: string;
    onSelectSection?: (section: ManageSection) => void;
}) {
    const t = useTranslations('ManagePage');

    return (
        // The title takes the room beside the back button, so a long name (Greek ones are) wraps instead of running under it.
        <header className="sticky top-0 z-20 flex min-h-[4.25rem] items-center gap-3 border-b border-border/60 bg-event/95 py-3 pr-4 pl-3 backdrop-blur lg:hidden">
            {/* Back */}
            <ManageNavLink
                eventId={eventId}
                navKey="overview"
                onSelectSection={onSelectSection}
                className="inline-flex min-h-10 shrink-0 items-center gap-0.5 rounded-full bg-primary-light pr-3.5 pl-2 text-sm font-bold text-primary-dark"
            >
                <ChevronLeft className="h-5 w-5" strokeWidth={2.2} aria-hidden="true" />
                {t('sections.overview')}
            </ManageNavLink>

            {/* Title */}
            <h1 className="min-w-0 flex-1 text-center text-[17px] leading-tight font-bold text-ink">{title}</h1>
        </header>
    );
}
