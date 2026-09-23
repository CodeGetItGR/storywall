'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';

import { FeedPageSkeleton } from '@/components/feed/FeedPageSkeleton';
import { SessionLocationPageShell } from '@/components/session-location/SessionLocationPageShell';
import { useEvent } from '@/hooks/useEvent';
import { ApiError } from '@/lib/api/client';
import { routes } from '@/lib/routes';
import { resolveSessionLocation, type SessionLocationRole } from '@/lib/sessionLocations';

const SESSION_LOCATION_ROLES = new Set<string>(['main', 'secondary']);

function parseSessionLocationRole(role: string | undefined): SessionLocationRole | null {
    return role && SESSION_LOCATION_ROLES.has(role) ? (role as SessionLocationRole) : null;
}

export function SessionLocationBoundary({ eventId, role }: { eventId: string; role: string | undefined }) {
    const router = useRouter();
    const { data: event, error, isLoading } = useEvent(eventId);
    const locationRole = parseSessionLocationRole(role);
    const location = useMemo(() => (event ? resolveSessionLocation(event, locationRole) : null), [event, locationRole]);

    useEffect(() => {
        if (!isLoading && (!event || (error instanceof ApiError && error.status === 404))) {
            router.replace(routes.eventNotFound);
        }
    }, [error, event, isLoading, router]);

    if (isLoading) {
        return <FeedPageSkeleton />;
    }

    if (!event || !location || (error instanceof ApiError && error.status === 404)) {
        return null;
    }

    return <SessionLocationPageShell eventId={eventId} location={location} />;
}
