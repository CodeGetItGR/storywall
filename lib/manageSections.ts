import { routes } from '@/lib/routes';

/**
 * The host dashboard's nav. The desktop sidebar and the mobile Overview list both
 * read `manageNavGroups`, in this exact order. Danger zone always sits apart, last.
 * A section opens inside the dashboard through `?tab=`; a page (Share links,
 * Vendors) has its own route under /manage and the same frame.
 */
export type ManageSection = 'overview' | 'settings' | 'theme' | 'billing' | 'gift' | 'rsvp' | 'invitation' | 'members' | 'danger';
export type ManagePage = 'shareLinks' | 'vendors';
export type ManageNavKey = ManageSection | ManagePage;
export type ManageNavGroup = { key: 'event' | 'people'; items: ManageNavKey[] };

export const manageNavGroups: ManageNavGroup[] = [
    { key: 'event', items: ['overview', 'settings', 'theme', 'billing', 'gift'] },
    { key: 'people', items: ['rsvp', 'invitation', 'shareLinks', 'members', 'vendors'] },
];

// Every section, in nav order; `?tab=` accepts only these.
export const manageSections: ManageSection[] = ['overview', 'settings', 'theme', 'billing', 'gift', 'rsvp', 'invitation', 'members', 'danger'];

export function isManagePage(key: ManageNavKey): key is ManagePage {
    return key === 'shareLinks' || key === 'vendors';
}

export function manageNavHref(eventId: string, key: ManageNavKey): string {
    if (key === 'shareLinks') return routes.events.invitationsQr(eventId);
    if (key === 'vendors') return routes.events.manageVendors(eventId);
    return routes.events.manage(eventId, { tab: key === 'overview' ? null : key });
}

// The nav for this event: each group keeps its visible entries, an empty group goes.
export function visibleManageNav(
    visibleSections: ManageSection[],
    pages: Record<ManagePage, boolean>,
): { groups: ManageNavGroup[]; showDanger: boolean } {
    const isShown = (key: ManageNavKey) => (isManagePage(key) ? pages[key] : visibleSections.includes(key));
    return {
        groups: manageNavGroups.map((group) => ({ ...group, items: group.items.filter(isShown) })).filter((group) => group.items.length > 0),
        showDanger: visibleSections.includes('danger'),
    };
}

// Sections named after a module show that module's name for the event type.
export const manageSectionModuleKeys: Partial<Record<ManageSection, string>> = { rsvp: 'rsvp', theme: 'theme' };

export function parseManageSection(value: string | null): ManageSection {
    return manageSections.find((section) => section === value) ?? 'overview';
}

// Danger is primary-host only; RSVP exists only when the event's plan includes it;
// the gift section only on a gift event, or for a primary host whose plan can be given;
// the theme section only while the event can pick a theme (canPickTheme);
// the invitation section only where online invitations are offered for the event's type;
// Members only on an event that takes guests (not a lite event).
export function visibleManageSections({
    canDelete,
    rsvpAvailable,
    giftAvailable = false,
    themeAvailable = false,
    invitationAvailable = false,
    membersAvailable = true,
}: {
    canDelete: boolean;
    rsvpAvailable: boolean;
    giftAvailable?: boolean;
    themeAvailable?: boolean;
    invitationAvailable?: boolean;
    membersAvailable?: boolean;
}): ManageSection[] {
    return manageSections.filter(
        (section) =>
            (section !== 'danger' || canDelete) &&
            (section !== 'rsvp' || rsvpAvailable) &&
            (section !== 'gift' || giftAvailable) &&
            (section !== 'theme' || themeAvailable) &&
            (section !== 'invitation' || invitationAvailable) &&
            (section !== 'members' || membersAvailable),
    );
}

// The section to show. A draft shows only its overview. A section whose
// availability is still loading keeps its place instead of bouncing to the overview.
export function resolveManageSection(
    requested: ManageSection,
    { isDraft, visibleSections, pendingSections = [] }: { isDraft: boolean; visibleSections: ManageSection[]; pendingSections?: ManageSection[] },
): ManageSection {
    if (isDraft) return 'overview';
    return visibleSections.includes(requested) || pendingSections.includes(requested) ? requested : 'overview';
}
