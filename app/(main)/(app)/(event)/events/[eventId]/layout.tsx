import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { eventKeys } from '@/hooks/useEvent';
import { resolveServerEventDetail } from '@/lib/auth/serverEventContext';
import { makeQueryClient } from '@/lib/queryClient';

type LayoutProps = { children: ReactNode; params: Promise<{ eventId: string }> };

// Seeds the detail of the event the URL names, which EventProvider's
// useEvent() reads on every page below. Layouts and pages render in parallel,
// so this loads alongside the (event) layout's memberships, and pages that
// gate on the same detail share this one fetch within the render.
export default async function EventIdLayout({ children, params }: LayoutProps) {
    const { eventId } = await params;
    const queryClient = makeQueryClient();
    const event = await resolveServerEventDetail(eventId);
    if (event) queryClient.setQueryData(eventKeys.detail(eventId), event);

    return <HydrationBoundary state={dehydrate(queryClient)}>{children}</HydrationBoundary>;
}
