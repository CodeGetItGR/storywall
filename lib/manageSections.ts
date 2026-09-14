/**
 * The host dashboard is one flat list of sections at every screen size: the
 * desktop sidebar, the mobile section sheet and the `?tab=` query all read this
 * table, in this exact order. Invitations (invites, co-hosts) live inside the
 * Members section; QR/share links have their own dedicated page linked from there.
 */
export type ManageSection = 'overview' | 'settings' | 'rsvp' | 'members' | 'billing' | 'help' | 'danger';

export const manageSections: ManageSection[] = ['overview', 'settings', 'rsvp', 'members', 'billing', 'help', 'danger'];

export function parseManageSection(value: string | null): ManageSection {
    return manageSections.find((section) => section === value) ?? 'overview';
}
