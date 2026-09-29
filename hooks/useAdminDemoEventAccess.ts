'use client';

import { useAdminDemoEvents } from '@/hooks/useAdminDemoEvents';
import { useAuth } from '@/hooks/useAuth';
import { urlEventId } from '@/providers/EventProvider';

// Admins normally stay in /admin. The one exception is a current demo event's pages: the
// admin hosts it and fills it with content through the normal host screens.
export function useAdminDemoEventAccess(pathname: string) {
    const { user } = useAuth();
    const isAdmin = user?.role === 'ADMIN';
    const eventId = urlEventId(pathname);
    const demoEvents = useAdminDemoEvents({ enabled: isAdmin && Boolean(eventId) });

    const isDemoEventRoute = Boolean(eventId && demoEvents.data?.some((demo) => demo.eventId === eventId));
    return {
        isChecking: isAdmin && Boolean(eventId) && demoEvents.isLoading,
        isAdminAllowed: isAdmin && isDemoEventRoute,
    };
}
