import { NextRequest, NextResponse } from 'next/server';

import { endpoints } from '@/lib/api/endpoints';
import { serverGet } from '@/lib/api/serverFetch';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { routeHandlerAccessToken } from '@/lib/auth/serverEventContext';
import { buildIcs, calendarEntries } from '@/lib/eventCalendar';
import { routes } from '@/lib/routes';

// One calendar entry as an .ics file, for Apple Calendar and other apps that
// import files. Served from here rather than built in the browser because an
// iPhone only offers "Add to Calendar" for a text/calendar response.
// ?session=<id> picks a session; without it, the event's own date.
export async function GET(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
    const { eventId } = await params;
    const accessToken = await routeHandlerAccessToken();
    if (!accessToken) return new NextResponse(null, { status: 503 });

    let event: EventDetailResponseDto;
    try {
        event = await serverGet<EventDetailResponseDto>(endpoints.events.byId(eventId), accessToken);
    } catch {
        return new NextResponse(null, { status: 404 });
    }

    const sessionId = request.nextUrl.searchParams.get('session');
    const entry = calendarEntries(event).find((candidate) => candidate.sessionId === sessionId);
    if (!entry) return new NextResponse(null, { status: 404 });

    const ics = buildIcs(entry, {
        uid: `${sessionId ?? eventId}@storywall`,
        url: new URL(routes.events.feed(eventId), request.nextUrl.origin).toString(),
    });

    return new NextResponse(ics, {
        headers: {
            'Content-Type': 'text/calendar; charset=utf-8',
            'Content-Disposition': 'inline; filename="event.ics"',
            'Cache-Control': 'private, no-store',
        },
    });
}
