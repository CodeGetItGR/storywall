'use client';

import { CalendarHeart } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { EventListItem } from '@/components/profile/EventListItem';
import Avatar from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { useEventDetails } from '@/hooks/useEvent';
import { useActiveMember, useEventContextLoading, useMyMemberships } from '@/providers/EventProvider';

function getInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function ProfilePage() {
    const t = useTranslations('ProfilePage');
    const { user } = useAuth();
    const memberships = useMyMemberships();
    const activeMember = useActiveMember();
    const isLoading = useEventContextLoading();
    const eventQueries = useEventDetails(memberships.map((m) => m.eventId));

    if (isLoading) {
        return (
            <div className="max-w-2xl mx-auto pb-24 lg:pb-8 px-4 pt-6">
                <div className="bg-card rounded-2xl p-4 flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-surface-muted animate-pulse" />
                    <div className="flex-1 space-y-2">
                        <div className="h-4 w-32 bg-surface-muted rounded animate-pulse" />
                        <div className="h-3 w-44 bg-surface-muted rounded animate-pulse" />
                    </div>
                </div>
                <div className="h-3 w-24 bg-surface-muted rounded animate-pulse mt-6 mb-3 ml-1" />
                <div className="bg-card rounded-2xl divide-y divide-border overflow-hidden">
                    {[0, 1, 2].map((i) => (
                        <div key={i} className="flex items-center gap-3 px-4 py-3">
                            <div className="w-10 h-10 rounded-full bg-surface-muted animate-pulse shrink-0" />
                            <div className="flex-1 space-y-1.5">
                                <div className="h-3.5 w-28 bg-surface-muted rounded animate-pulse" />
                                <div className="h-3 w-16 bg-surface-muted rounded animate-pulse" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (memberships.length === 0) {
        return (
            <div className="max-w-2xl mx-auto pb-24 lg:pb-8 px-4 pt-6">
                <div className="bg-card rounded-2xl flex flex-col items-center justify-center text-center py-16 px-6">
                    <div className="w-16 h-16 rounded-full bg-surface-muted flex items-center justify-center mb-4">
                        <CalendarHeart className="w-7 h-7 text-ink-faint" />
                    </div>
                    <h2 className="text-base font-bold text-ink mb-1">{t('emptyMemberships.title')}</h2>
                    <p className="text-sm text-ink-muted max-w-xs leading-relaxed mb-5">{t('emptyMemberships.body')}</p>
                    <Link
                        href="/welcome"
                        className="px-5 py-2 rounded-full bg-gradient-brand text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                    >
                        {t('emptyMemberships.cta')}
                    </Link>
                </div>
            </div>
        );
    }

    const featuredMember = activeMember ?? memberships[0];

    return (
        <div className="max-w-2xl mx-auto pb-24 lg:pb-8 px-4 pt-6">
            {/* Identity */}
            <div className="bg-card rounded-2xl p-4 flex items-center gap-4">
                <Avatar initials={getInitials(featuredMember.displayName)} size="lg" alt={featuredMember.displayName} />
                <div className="min-w-0">
                    <h1 className="text-base font-bold text-ink truncate leading-tight">{featuredMember.displayName}</h1>
                    {user?.email && <p className="text-sm text-ink-muted truncate mt-0.5">{user.email}</p>}
                </div>
            </div>

            {/* Events */}
            <div className="mt-6">
                <h2 className="text-xs font-semibold text-ink-faint uppercase tracking-wide px-1 mb-2">{t('yourEvents')}</h2>
                <div className="bg-card rounded-2xl divide-y divide-border overflow-hidden">
                    {memberships.map((member, i) => (
                        <EventListItem
                            key={member.eventId}
                            eventId={member.eventId}
                            member={member}
                            event={eventQueries[i]?.data}
                            isLoading={eventQueries[i]?.isLoading ?? false}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
