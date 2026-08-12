'use client';

import { useTranslations } from 'next-intl';

import { EventListItem } from '@/components/profile/EventListItem';
import type { useEventDetails } from '@/hooks/useEvent';
import type { EventMemberResponseDto } from '@/lib/api/types';

interface ProfileContentProps {
    eventQueries: ReturnType<typeof useEventDetails>;
    memberships: EventMemberResponseDto[];
}

export function ProfileContent({ eventQueries, memberships }: ProfileContentProps) {
    const t = useTranslations('ProfilePage');

    return (
        <div className="mx-auto max-w-2xl px-4 pt-6 pb-24 lg:pb-8">
            <div className="mt-6">
                <h2 className="mb-2 px-1 text-xs font-semibold tracking-wide text-ink-faint uppercase">{t('yourEvents')}</h2>
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
            </div>
        </div>
    );
}
