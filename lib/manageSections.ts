/**
 * The host dashboard is one flat list of sections at every screen size: the
 * desktop sidebar, the mobile section sheet and the `?tab=` query all read this
 * table. Billing's parts are entries here rather than a second tab level.
 */
export type ManageSection = 'overview' | 'settings' | 'rsvp' | 'invitations' | 'plan' | 'coverage' | 'orders' | 'refund';
export type ManageSectionGroup = 'event' | 'guests' | 'billing';

export const manageSectionGroups: { group: ManageSectionGroup; sections: ManageSection[] }[] = [
    { group: 'event', sections: ['overview', 'settings'] },
    { group: 'guests', sections: ['rsvp', 'invitations'] },
    { group: 'billing', sections: ['plan', 'coverage', 'orders', 'refund'] },
];

export const billingSections = ['plan', 'coverage', 'orders', 'refund'] as const;
export type BillingSection = (typeof billingSections)[number];

const allSections = manageSectionGroups.flatMap((entry) => entry.sections);

export function isBillingSection(section: ManageSection): section is BillingSection {
    return (billingSections as readonly string[]).includes(section);
}

/**
 * `?tab=billing` still points here from checkout, the lifecycle banner and the
 * usage panel, so it resolves to billing's first section rather than 404-ing
 * back to the overview.
 */
export function parseManageSection(value: string | null): ManageSection {
    if (value === 'billing') return 'plan';
    return allSections.find((section) => section === value) ?? 'overview';
}
