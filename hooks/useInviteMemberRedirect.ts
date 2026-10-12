'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { useMyEvents } from '@/hooks/useMyEvents';
import { routes } from '@/lib/routes';

// A signed-in member reopening an invite link goes straight to the event's
// feed: there is nothing to join. Returns true while that is still being
// decided or the redirect is under way, so the page can hold its skeleton.
export function useInviteMemberRedirect(eventId: string | null | undefined): boolean {
    const router = useRouter();
    const { isAuthenticated } = useAuth();
    const { data: memberships, isLoading } = useMyEvents();
    const isMember = Boolean(eventId && memberships?.some((membership) => membership.eventId === eventId));

    useEffect(() => {
        if (isMember && eventId) router.replace(routes.events.feed(eventId));
    }, [eventId, isMember, router]);

    return isAuthenticated && (isLoading || isMember);
}
