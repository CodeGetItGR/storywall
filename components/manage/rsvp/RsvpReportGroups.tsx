'use client';

import { useTranslations } from 'next-intl';

import type { RsvpReportGroupDto } from '@/lib/api/types';
import { reportSectionKey } from '@/lib/rsvpReport';

import { RsvpReportGroup } from './RsvpReportGroup';

export function RsvpReportGroups({ groups }: { groups: RsvpReportGroupDto[] }) {
    const t = useTranslations('ManagePage.rsvpReport');

    return (
        <section className="flex flex-col gap-6">
            {/* Heading */}
            <h2 className="text-xs font-bold tracking-wide text-ink-faint uppercase">{t('guestList')}</h2>

            {groups.length === 0 ? (
                <p className="text-sm text-ink-muted">{t('empty')}</p>
            ) : (
                groups.map((group) => <RsvpReportGroup key={reportSectionKey(group)} group={group} />)
            )}
        </section>
    );
}
