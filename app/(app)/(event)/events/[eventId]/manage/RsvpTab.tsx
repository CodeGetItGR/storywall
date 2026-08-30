'use client';

import { BarChart3, FileText, List } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type MouseEvent, useCallback, useState } from 'react';

import { RsvpListPanel, RsvpReportsPanel, RsvpStatsPanel } from '@/components/manage/rsvp';
import { type RosterMember, type RosterRsvp, useRsvpRoster } from '@/hooks/useRsvpRoster';
import { cn } from '@/lib/utils';

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
    const { responseCount, seatsClaimed, adultsTotal, kidsTotal, peopleByStatus } = useRsvpRoster(members, rsvps);

    const handleSubTabClick = useCallback((event: MouseEvent<HTMLButtonElement>) => {
        const next = event.currentTarget.dataset.subtab as RsvpSubTab | undefined;
        if (next) setSubTab(next);
    }, []);

    return (
        <div className="flex flex-col gap-7">
            {/* Sub-tabs */}
            <div className="flex gap-4 w-full items-center justify-center">
                {(
                    [
                        { key: 'stats', icon: BarChart3 },
                        { key: 'list', icon: List },
                        { key: 'reports', icon: FileText },
                    ] as const
                ).map(({ key, icon: Icon }) => (
                    <button
                        key={key}
                        type="button"
                        data-subtab={key}
                        onClick={handleSubTabClick}
                        aria-pressed={subTab === key}
                        className={cn(
                            'flex min-h-9 items-center gap-1.5 border-b-2 px-1 text-xs font-semibold transition-colors',
                            subTab === key ? 'border-primary text-ink' : 'border-transparent text-ink-muted hover:text-ink'
                        )}
                    >
                        <Icon className="h-3.5 w-3.5" />
                        {t(`rsvpTabs.${key}`)}
                    </button>
                ))}
            </div>

            {subTab === 'stats' && (
                <RsvpStatsPanel
                    countdownTarget={rsvpDeadline ?? startAt}
                    isRsvpDeadline={Boolean(rsvpDeadline)}
                    responseCount={responseCount}
                    seatsClaimed={seatsClaimed}
                    adultsTotal={adultsTotal}
                    kidsTotal={kidsTotal}
                    peopleByStatus={peopleByStatus}
                />
            )}
            {subTab === 'list' && <RsvpListPanel members={members} rsvps={rsvps} />}
            {subTab === 'reports' && <RsvpReportsPanel eventId={eventId} />}
        </div>
    );
}
