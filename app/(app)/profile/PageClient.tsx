'use client';

import { ProfileContent } from '@/components/profile';
import { useProfilePageData } from '@/hooks/useProfilePageData';

export default function ProfilePage() {
    const { displayName, email, eventQueries, isLoading, memberships } = useProfilePageData();

    return <ProfileContent displayName={displayName} email={email} eventQueries={eventQueries} isLoading={isLoading} memberships={memberships} />;
}
