import { Clock, Ticket, Users } from 'lucide-react';
import type { useTranslations } from 'next-intl';

import Section from '@/components/manage/Section';
import { cn } from '@/lib/utils';

function Stat({ label, value, sub, color, Icon }: { label: string; value: string; sub: string; color: string; Icon: React.ElementType }) {
    return (
        <div>
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-3', color)}>
                <Icon className="w-4 h-4" strokeWidth={1.8} />
            </div>
            <p className="text-2xl font-bold text-ink tabular-nums leading-none">{value}</p>
            <p className="text-xs font-semibold text-ink mt-1">{label}</p>
            <p className="text-[11px] text-ink-muted mt-0.5">{sub}</p>
        </div>
    );
}

export default function OverviewTab({
    t,
    memberCount,
    daysToGo,
    invitationCount,
    rsvpBreakdown,
    onSeeAllRsvp,
    onSeeAllInvitations,
}: {
    t: ReturnType<typeof useTranslations>;
    memberCount: number;
    daysToGo: number;
    invitationCount: number;
    rsvpBreakdown: readonly { key: string; count: number; color: string }[];
    onSeeAllRsvp: () => void;
    onSeeAllInvitations: () => void;
}) {
    const rsvpTotal = rsvpBreakdown.reduce((sum, r) => sum + r.count, 0) || 1;

    return (
        <div className="px-4 flex flex-col gap-6">
            <div className="grid grid-cols-3 gap-4">
                <Stat
                    label={t('stats.totalGuests.label')}
                    value={`${memberCount}`}
                    sub={t('stats.totalGuests.sub')}
                    color="bg-emerald-50 text-emerald-600"
                    Icon={Users}
                />
                <Stat
                    label={t('stats.daysToGo.label')}
                    value={`${daysToGo}`}
                    sub={t('stats.daysToGo.sub')}
                    color="bg-rose-50 text-rose-500"
                    Icon={Clock}
                />
                <Stat
                    label={t('stats.invitations.label')}
                    value={`${invitationCount}`}
                    sub={t('stats.invitations.sub')}
                    color="bg-sky-50 text-sky-600"
                    Icon={Ticket}
                />
            </div>

            <div className="h-px bg-border" />

            <Section
                title={t('rsvpBreakdown.title')}
                action={
                    <button onClick={onSeeAllRsvp} className="text-xs text-primary font-semibold hover:underline">
                        {t('seeAll')}
                    </button>
                }
            >
                <div className="flex gap-2">
                    {rsvpBreakdown.map(({ key, count, color }) => {
                        const pct = Math.round((count / rsvpTotal) * 100);
                        return (
                            <div key={key} className="flex-1 text-center">
                                <p className="text-xl font-bold text-ink tabular-nums">{count}</p>
                                <div className="h-1.5 rounded-full bg-border my-1.5 overflow-hidden">
                                    <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
                                </div>
                                <p className="text-[10px] text-ink-muted">{t(`rsvpBreakdown.${key}`)}</p>
                            </div>
                        );
                    })}
                </div>
            </Section>

            <div className="h-px bg-border" />

            <Section
                title={t('invitationsCard.title')}
                action={
                    <button onClick={onSeeAllInvitations} className="text-xs text-primary font-semibold hover:underline">
                        {t('seeAll')}
                    </button>
                }
            >
                <p className="text-xs text-ink-muted">{t('invitationsCard.summary', { count: invitationCount })}</p>
            </Section>
        </div>
    );
}
