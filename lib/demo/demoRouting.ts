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
