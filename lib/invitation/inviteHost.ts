// Published invitations live at invite.storywall.gr/<slug> (invite.staging.storywall.gr on staging).
// proxy.ts rewrites that link to the page below and sends every other path on the host to the main site.

// The page that draws a published invitation. On staging and locally it also opens here on the main site.
export const PUBLISHED_INVITATION_PATH_PREFIX = '/save-my-date/i';

// The backend's slug rule: 3 to 60 lowercase letters or digits, single hyphens between them.
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SLUG_MIN_LENGTH = 3;
const SLUG_MAX_LENGTH = 60;

export function isInvitationSlug(value: string): boolean {
    return value.length >= SLUG_MIN_LENGTH && value.length <= SLUG_MAX_LENGTH && SLUG_PATTERN.test(value);
}

export function publishedInvitationPath(slug: string): string {
    return `${PUBLISHED_INVITATION_PATH_PREFIX}/${slug}`;
}

// Any host whose first label is `invite`: invite.storywall.gr, invite.staging.storywall.gr, invite.localhost.
export function isInviteHost(hostname: string): boolean {
    return hostname.toLowerCase().split('.')[0] === 'invite';
}

export type InviteHostRoute =
    // A slug: draw the invitation.
    | { kind: 'invitation'; path: string }
    // A public file the invitation loads (calendar icons, fonts, the favicon, robots.txt).
    | { kind: 'file' }
    // Anything else belongs to the main site.
    | { kind: 'main-site' };

export function inviteHostRoute(pathname: string): InviteHostRoute {
    const segments = pathname.split('/').filter(Boolean);
    const last = segments.at(-1) ?? '';
    if (last.includes('.')) return { kind: 'file' };
    if (segments.length === 1 && isInvitationSlug(segments[0])) return { kind: 'invitation', path: publishedInvitationPath(segments[0]) };
    return { kind: 'main-site' };
}

// The same path on the main site: the invite host without its `invite.` label (staging.storywall.gr,
// localhost), or the production origin when that is what is left.
export function mainSiteUrl(inviteUrl: URL, siteUrl: string): URL {
    const site = new URL(siteUrl);
    const host = inviteUrl.host.slice(inviteUrl.host.indexOf('.') + 1);
    const path = `${inviteUrl.pathname}${inviteUrl.search}`;
    if (site.host === host || site.host === `www.${host}`) return new URL(path, site);
    const target = new URL(path, inviteUrl);
    target.host = host;
    return target;
}
