'use client';

import { useTranslations } from 'next-intl';

import { ProfileContent, ProfileEmptyState, ProfileLoadingState } from '@/components/profile';
import { useProfilePageData } from '@/hooks/useProfilePageData';

export default function ProfilePage() {
    const t = useTranslations('ProfilePage');
    const { eventQueries, isEmpty, isLoading, memberships } = useProfilePageData();

    if (isLoading) {
        return <ProfileLoadingState />;
    }

    if (isEmpty) {
        return <ProfileEmptyState t={t} />;
    }

    return <ProfileContent eventQueries={eventQueries} memberships={memberships} t={t} />;
}
