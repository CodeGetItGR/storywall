'use client';

import { useTranslations } from 'next-intl';

import { EventListItem } from '@/components/profile/EventListItem';
import { LanguagePreference } from '@/components/profile/LanguagePreference';
import { ProfileEmptyState } from '@/components/profile/ProfileEmptyState';
import { ProfileLoadingState } from '@/components/profile/ProfileLoadingState';
import type { useEventDetails } from '@/hooks/useEvent';
import type { EventMemberResponseDto } from '@/lib/api/types';

interface ProfileContentProps {
    eventQueries: ReturnType<typeof useEventDetails>;
    isLoading: boolean;
    memberships: EventMemberResponseDto[];
}

export function ProfileContent({ eventQueries, isLoading, memberships }: ProfileContentProps) {
    const t = useTranslations('ProfilePage');

    return (
        <div className="mx-auto max-w-2xl px-4 pt-6 pb-24 lg:pb-8">
            <LanguagePreference />

            <section className="mt-7" aria-labelledby="profile-events-heading">
                <h2 id="profile-events-heading" className="mb-2 px-1 text-xs font-semibold tracking-wide text-ink-faint uppercase">
                    {t('yourEvents')}
                </h2>
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
