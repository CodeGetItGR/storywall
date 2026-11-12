import type { AdminTab } from '@/components/admin/AdminNavigationContext';
import type { PlatformRole } from '@/lib/api/types';
import { routes } from '@/lib/routes';
import { showsSaveMyDate } from '@/lib/saveMyDateRelease';

// MARKETING works the console's marketing group, partner outreach and their own phones.
// The server enforces the same split; hiding the rest here only keeps the sidebar honest.
const MARKETING_TABS: ReadonlySet<AdminTab> = new Set<AdminTab>([
    'outreach',
    'outreachRequests',
    'campaigns',
    'discountCodes',
    'guestOffer',
    'appReviews',
    'phones',
]);

export function canUseAdminConsole(role: PlatformRole | null | undefined): boolean {
    return role === 'ADMIN' || role === 'MARKETING';
}

export function canOpenAdminTab(role: PlatformRole | null | undefined, tab: AdminTab): boolean {
    if (role === 'ADMIN') return true;
    if (role === 'MARKETING') return MARKETING_TABS.has(tab);
    return false;
}

// Where the console opens, and where a section the role can't see falls back to.
export function adminHomeTab(role: PlatformRole | null | undefined): AdminTab {
    return role === 'MARKETING' ? 'outreach' : 'metrics';
}

export function resolveAdminTab(role: PlatformRole | null | undefined, tab: AdminTab): AdminTab {
    return canOpenAdminTab(role, tab) ? tab : adminHomeTab(role);
}

// The Save my date admin (/admin/save-my-date) is for admins only, and only where Save my date shows.
export function canUseSaveMyDateAdmin(role: PlatformRole | null | undefined, shown = showsSaveMyDate()): boolean {
    return shown && role === 'ADMIN';
}

// The console's old Save my date themes section (#save-my-date-themes) lives on the Save my date page now.
// Anyone who can't open that page lands on the console's home instead.
export function movedSaveMyDateHashTarget(role: PlatformRole | null | undefined, hash: string, shown = showsSaveMyDate()): string | null {
    if (hash !== '#save-my-date-themes' || !canUseSaveMyDateAdmin(role, shown)) return null;
    return routes.saveMyDateAdmin.themes;
}
