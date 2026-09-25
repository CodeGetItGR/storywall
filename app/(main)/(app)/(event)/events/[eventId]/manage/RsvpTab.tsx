'use client';

import { BarChart3, FileText, List } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { RsvpListPanel, RsvpReportsPanel, RsvpStatsPanel } from '@/components/manage/rsvp';
import { type SubTabItem, SubTabs } from '@/components/ui/SubTabs';
import type { RosterMember, RosterRsvp } from '@/hooks/useRsvpRoster';
import { type RsvpSubTab, useRsvpSubTab } from '@/hooks/useRsvpSubTab';

export default function RsvpTab({
    eventId,
    members,
    rsvps,
    startAt,
    rsvpDeadline,
    canWrite,
}: {
    eventId: string;
    members: RosterMember[];
    rsvps: RosterRsvp[];
    startAt: string;
    rsvpDeadline: string | null;
    canWrite: boolean;
}) {
    const t = useTranslations('ManagePage');
    const { subTab, setSubTab } = useRsvpSubTab();
    const tabs = useMemo<SubTabItem<RsvpSubTab>[]>(
        () => [
            { key: 'stats', icon: BarChart3, label: t('rsvpTabs.stats') },
            { key: 'list', icon: List, label: t('rsvpTabs.list') },
            { key: 'reports', icon: FileText, label: t('rsvpTabs.reports') },
        ],
        [t],
    );

    return (
        <div className="flex flex-col gap-7">
            {/* Sub-tabs */}
            <SubTabs tabs={tabs} active={subTab} onSelectAction={setSubTab} />

            {/* Stats */}
            {subTab === 'stats' && (
                <RsvpStatsPanel
                    eventId={eventId}
                    canWrite={canWrite}
                    rsvpDeadline={rsvpDeadline}
                    countdownTarget={rsvpDeadline ?? startAt}
                    isRsvpDeadline={Boolean(rsvpDeadline)}
                />
            )}

            {/* List */}
            {subTab === 'list' && <RsvpListPanel members={members} rsvps={rsvps} />}

            {/* Reports */}
            {subTab === 'reports' && <RsvpReportsPanel eventId={eventId} />}
        </div>
    );
}
