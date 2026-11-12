/**
 * The host dashboard is one flat list of sections at every screen size: the
 * desktop sidebar, the mobile section sheet and the `?tab=` query all read this
 * table, in this exact order. Co-host invitations live inside the Members
 * section; QR/share links have their own dedicated page linked from there.
 */
export type ManageSection = 'overview' | 'settings' | 'theme' | 'invitation' | 'rsvp' | 'members' | 'gift' | 'billing' | 'help' | 'danger';

export const manageSections: ManageSection[] = [
    'overview',
    'settings',
    'theme',
    'invitation',
    'rsvp',
    'members',
    'gift',
    'billing',
    'help',
    'danger',
];

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
