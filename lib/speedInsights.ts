type VitalEvent = { url: string; route?: string };

// Speed Insights reports each Web Vital with its page URL. Invite, QR, gift and email links carry a
// token in theirs, so a vital goes out under its route (`/invite/[token]`) with no query, and one
// without a route isn't sent.
export function redactVitalUrl<T extends VitalEvent>(event: T): T | null {
    if (!event.route) return null;
    return { ...event, url: `${new URL(event.url).origin}${event.route}` };
}
