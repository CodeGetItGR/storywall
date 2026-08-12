'use client';

import { ProfileContent, ProfileEmptyState, ProfileLoadingState } from '@/components/profile';
import { useProfilePageData } from '@/hooks/useProfilePageData';

export default function ProfilePage() {
    const { eventQueries, isEmpty, isLoading, memberships } = useProfilePageData();

    if (isLoading) {
        return <ProfileLoadingState />;
    }

    if (isEmpty) {
        return <ProfileEmptyState />;
    }

    return <ProfileContent eventQueries={eventQueries} memberships={memberships} />;
}
