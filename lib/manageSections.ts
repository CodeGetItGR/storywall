/**
 * The host dashboard is one flat list of sections at every screen size: the
 * desktop sidebar, the mobile section sheet and the `?tab=` query all read this
 * table. Billing's parts are entries here rather than a second tab level.
 */
export type ManageSection = 'overview' | 'settings' | 'help' | 'danger' | 'members' | 'rsvp' | 'invitations' | 'billing';
export type ManageSectionGroup = 'event' | 'guests' | 'billing';

export const manageSectionGroups: { group: ManageSectionGroup; sections: ManageSection[] }[] = [
    { group: 'event', sections: ['overview', 'settings', 'help', 'danger'] },
    { group: 'guests', sections: ['members', 'rsvp', 'invitations'] },
    { group: 'billing', sections: ['billing'] },
];

const allSections = manageSectionGroups.flatMap((entry) => entry.sections);

export function parseManageSection(value: string | null): ManageSection {
    return allSections.find((section) => section === value) ?? 'overview';
}
