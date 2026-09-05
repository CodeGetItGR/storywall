'use client';

import { BarChart3, FileText, List } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { RsvpListPanel, RsvpReportsPanel, RsvpStatsPanel } from '@/components/manage/rsvp';
import { type SubTabItem, SubTabs } from '@/components/ui/SubTabs';
import { type RosterMember, type RosterRsvp, useRsvpRoster } from '@/hooks/useRsvpRoster';

type RsvpSubTab = 'stats' | 'list' | 'reports';

export default function RsvpTab({
    eventId,
    members,
    rsvps,
    startAt,
    rsvpDeadline,
}: {
    eventId: string;
    members: RosterMember[];
    rsvps: RosterRsvp[];
    startAt: string;
    rsvpDeadline: string | null;
}) {
    const t = useTranslations('ManagePage');
    const [subTab, setSubTab] = useState<RsvpSubTab>('stats');
    const { responseCount, seatsClaimed, adultsTotal, kidsTotal, peopleGoing, peopleNotGoing } = useRsvpRoster(
        members,
        rsvps
    );
    const tabs = useMemo<SubTabItem<RsvpSubTab>[]>(
        () => [
            { key: 'stats', icon: BarChart3, label: t('rsvpTabs.stats') },
            { key: 'list', icon: List, label: t('rsvpTabs.list') },
            { key: 'reports', icon: FileText, label: t('rsvpTabs.reports') },
        ],
        [t]
    );

    return (
        <div className="flex flex-col gap-7">
            {/* Sub-tabs */}
            <SubTabs tabs={tabs} active={subTab} onSelectAction={setSubTab} />

            {subTab === 'stats' && (
                <RsvpStatsPanel
                    countdownTarget={rsvpDeadline ?? startAt}
                    isRsvpDeadline={Boolean(rsvpDeadline)}
                    responseCount={responseCount}
                    seatsClaimed={seatsClaimed}
                    adultsTotal={adultsTotal}
                    kidsTotal={kidsTotal}
                    peopleGoing={peopleGoing}
                    peopleNotGoing={peopleNotGoing}
                />
            )}
            {subTab === 'list' && <RsvpListPanel members={members} rsvps={rsvps} />}
            {subTab === 'reports' && <RsvpReportsPanel eventId={eventId} />}
        </div>
    );
}
