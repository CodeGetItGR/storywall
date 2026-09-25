/**
 * The host dashboard is one flat list of sections at every screen size: the
 * desktop sidebar, the mobile section sheet and the `?tab=` query all read this
 * table, in this exact order. Co-host invitations live inside the Members
 * section; QR/share links have their own dedicated page linked from there.
 */
export type ManageSection = 'overview' | 'settings' | 'rsvp' | 'members' | 'billing' | 'help' | 'danger';

export const manageSections: ManageSection[] = ['overview', 'settings', 'rsvp', 'members', 'billing', 'help', 'danger'];

export function parseManageSection(value: string | null): ManageSection {
    return manageSections.find((section) => section === value) ?? 'overview';
}

// Danger is primary-host only; RSVP exists only when the event's plan includes it.
export function visibleManageSections({ canDelete, rsvpAvailable }: { canDelete: boolean; rsvpAvailable: boolean }): ManageSection[] {
    return manageSections.filter((section) => (section !== 'danger' || canDelete) && (section !== 'rsvp' || rsvpAvailable));
}
