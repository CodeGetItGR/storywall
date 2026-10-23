'use client';

import { useRouter } from 'next/navigation';
import { createContext, type ReactNode, useContext, useEffect } from 'react';

import { LoadingState } from '@/components/ui/LoadingState';
import { useAuth } from '@/hooks/useAuth';
import { useHasVendorCapability } from '@/hooks/useVendors';
import type { EventDetailResponseDto, VendorCapability } from '@/lib/api/types';
import { routes } from '@/lib/routes';
import { useActiveEvent, useEventContextLoading, useIsHost } from '@/providers/EventProvider';

type EventRouteContextValue = {
    activeEvent: EventDetailResponseDto;
    eventId: string;
    isHost: boolean;
};

const EventRouteContext = createContext<EventRouteContextValue | null>(null);

type EventRouteGateProps = {
    children: ReactNode;
    missingEventRedirectTo?: string;
    requireHost?: boolean;
    // With requireHost: a vendor whose type has this tool (and whose access window is open) gets in too.
    allowVendorCapability?: VendorCapability;
    guestRedirectTo?: string;
    // The page's own skeleton, shown while the event context resolves.
    fallback?: ReactNode;
};

export function EventRouteGate({
    children,
    missingEventRedirectTo,
    requireHost = false,
    allowVendorCapability,
    guestRedirectTo,
    fallback,
}: EventRouteGateProps) {
    const router = useRouter();
    const { isAuthenticated } = useAuth();
    const activeEvent = useActiveEvent();
    const isHost = useIsHost();
    const isContextLoading = useEventContextLoading();
    const eventId = activeEvent?.id ?? null;
    const resolvedMissingEventRedirectTo = missingEventRedirectTo ?? (isAuthenticated ? routes.home : routes.login);

    // Only a non-host on a vendor-open screen asks for the vendor role.
    const asksVendor = requireHost && Boolean(allowVendorCapability) && !isHost;
    const vendor = useHasVendorCapability(asksVendor ? eventId : null, allowVendorCapability ?? 'QR_READ');
    const vendorPending = asksVendor && vendor.isLoading;
    const blocked = requireHost && !isHost && !(asksVendor && vendor.allowed);

    useEffect(() => {
        if (isContextLoading || vendorPending) return;

        if (!eventId) {
            router.replace(resolvedMissingEventRedirectTo);
            return;
        }

        if (blocked) {
            router.replace(guestRedirectTo ?? routes.events.feed(eventId));
        }
    }, [blocked, eventId, guestRedirectTo, isContextLoading, resolvedMissingEventRedirectTo, router, vendorPending]);

    if (isContextLoading || !activeEvent || vendorPending || blocked) {
        return fallback ?? <EventRouteSpinner />;
    }

    const value = { activeEvent, eventId: activeEvent.id, isHost };
    return <EventRouteContext.Provider value={value}>{children}</EventRouteContext.Provider>;
}

export function useEventRouteContext(): EventRouteContextValue {
    const context = useContext(EventRouteContext);
    if (!context) {
        throw new Error('useEventRouteContext must be used within an EventRouteGate');
    }
    return context;
}

export function EventRouteSpinner() {
    return <LoadingState size="md" className="min-h-[50vh]" />;
}
