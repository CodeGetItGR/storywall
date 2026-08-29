import type { EventDetailResponseDto, EventSessionResponseDto, EventTypeConvention } from '@/lib/api/types';
import { sortSessions } from '@/lib/eventSessions';

export type SessionLocationRole = 'main' | 'secondary';
export type SessionLocationKind = 'church' | 'venue' | 'generic';

export type SessionLocationIcon = {
    kind: 'image' | 'map-pin';
    src?: string;
};

export type SessionLocationViewModel = {
    kind: SessionLocationKind;
    icon: SessionLocationIcon;
    title: string;
    locationName: string | null;
    mapsUrl: string | null;
};

type SemanticLocationKind = Exclude<SessionLocationKind, 'generic'>;

const DEFAULT_LOCATION_KIND: SessionLocationKind = 'generic';

const ROLE_KIND_BY_EVENT_TYPE: Partial<Record<EventTypeConvention, Partial<Record<SessionLocationRole, SemanticLocationKind>>>> = {
    BAPTISM: {
        main: 'church',
        secondary: 'venue',
    },
    WEDDING: {
        main: 'church',
        secondary: 'venue',
    },
};

const LOCATION_ICONS: Record<SessionLocationKind, SessionLocationIcon> = {
    church: { kind: 'image', src: '/icons/church.svg' },
    venue: { kind: 'image', src: '/icons/cocktail.svg' },
    generic: { kind: 'map-pin' },
};

function resolveLocationKind(eventType: EventTypeConvention, role: SessionLocationRole | null): SessionLocationKind {
    if (!role) return DEFAULT_LOCATION_KIND;

    return ROLE_KIND_BY_EVENT_TYPE[eventType]?.[role] ?? DEFAULT_LOCATION_KIND;
}

function getSessionForRole(sessions: EventSessionResponseDto[], role: SessionLocationRole | null): EventSessionResponseDto | null {
    if (role === 'main') return sessions.find((session) => session.isMain) ?? null;
    if (role === 'secondary') return sessions.find((session) => session.isSecondary) ?? null;

    return sortSessions(sessions)[0] ?? null;
}

export function resolveSessionLocation(event: EventDetailResponseDto, role: SessionLocationRole | null): SessionLocationViewModel {
    const session = getSessionForRole(event.sessions, role);
    const kind = resolveLocationKind(event.eventType, role);

    return {
        kind,
        icon: LOCATION_ICONS[kind],
        title: session?.title ?? event.title,
        locationName: session?.locationName ?? event.location.name ?? event.location.address,
        mapsUrl: session?.mapsUrl ?? event.location.mapsUrl,
    };
}

export function resolveSessionLocationIcon(eventType: EventTypeConvention, role: SessionLocationRole): SessionLocationIcon {
    return LOCATION_ICONS[resolveLocationKind(eventType, role)];
}
