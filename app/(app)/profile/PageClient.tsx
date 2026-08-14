'use client';

import { ProfileContent } from '@/components/profile';
import { useProfilePageData } from '@/hooks/useProfilePageData';

export default function ProfilePage() {
    const { eventQueries, isLoading, memberships } = useProfilePageData();

    return <ProfileContent eventQueries={eventQueries} isLoading={isLoading} memberships={memberships} />;
}
