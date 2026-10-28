// Maps a demo event's id to its /demo/{slug} base path, so routes.events.*(eventId) keeps the
// visitor inside /demo instead of linking to the real, login-protected /events/{id} tree.
// Registered in the browser once the snapshot loads; never populated on the server.
const demoBasePaths = new Map<string, string>();

export function registerDemoEventRoute(eventId: string, eventTypeSlug: string): void {
    demoBasePaths.set(eventId, `/demo/${eventTypeSlug}`);
}

export function demoEventBasePath(eventId: string): string | null {
    return demoBasePaths.get(eventId) ?? null;
}

// The demo's stand-ins for the pages a guest's QR code or invite link opens (/q/{token} and
// /invite/{token}), which the backend refuses for a demo event.
export type DemoGuestPage = 'upload' | 'invite';

export function demoGuestPagePath(eventTypeSlug: string, page: DemoGuestPage): string {
    return `/demo/${eventTypeSlug}/${page}`;
}

// Null outside the demo, where the real link is the only way in.
export function demoGuestPagePathForEvent(eventId: string, page: DemoGuestPage): string | null {
    const basePath = demoEventBasePath(eventId);
    return basePath ? `${basePath}/${page}` : null;
}

// /demo and every page under it.
export function isDemoPath(pathname: string | null): boolean {
    return pathname === '/demo' || (pathname?.startsWith('/demo/') ?? false);
}
