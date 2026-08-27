'use client';

import { Plus } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { AccountIdentity } from '@/components/profile/AccountIdentity';
import { AccountLogoutButton } from '@/components/profile/AccountLogoutButton';
import { EventListItem } from '@/components/profile/EventListItem';
import { LanguagePreference } from '@/components/profile/LanguagePreference';
import { ProfileEmptyState } from '@/components/profile/ProfileEmptyState';
import { ProfileLoadingState } from '@/components/profile/ProfileLoadingState';
import type { useEventDetails } from '@/hooks/useEvent';
import type { EventMemberResponseDto } from '@/lib/api/types';
import { routes } from '@/lib/routes';

interface ProfileContentProps {
    displayName: string | null;
    email: string | null;
    eventQueries: ReturnType<typeof useEventDetails>;
    isLoading: boolean;
    memberships: EventMemberResponseDto[];
}

export function ProfileContent({ displayName, email, eventQueries, isLoading, memberships }: ProfileContentProps) {
    const t = useTranslations('ProfilePage');

    return (
        <div className="mx-auto max-w-2xl px-4 pt-6 pb-24 lg:pb-8">
            {/* Account */}
            <section className="mb-6 flex items-center justify-between gap-3">
                <AccountIdentity displayName={displayName} email={email} />
                <AccountLogoutButton />
            </section>

            {/* Preferences */}
            <div className="mb-7">
                <LanguagePreference />
            </div>

            {/* Events */}
            <section aria-labelledby="profile-events-heading">
                <div className="mb-3 flex items-center justify-between gap-3 px-1">
                    <h2 id="profile-events-heading" className="text-xs font-semibold tracking-wide text-ink-faint uppercase">
                        {t('yourEvents')}
                    </h2>
                    <Link
                        href={routes.events.new}
                        className="inline-flex items-center gap-1.5 rounded-full bg-gradient-brand px-3.5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                    >
                        <Plus className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
                        {t('createEventCta')}
                    </Link>
                </div>
                {isLoading ? (
                    <ProfileLoadingState />
                ) : memberships.length === 0 ? (
                    <ProfileEmptyState />
                ) : (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                )}
            </section>
        </div>
    );
}
