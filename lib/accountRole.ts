import type { PlatformRole } from '@/lib/api/types';

// A signed-in account (not a guest): MARKETING is a USER with console access on top.
export function isAccountRole(role: PlatformRole | null | undefined): boolean {
    return role === 'USER' || role === 'ADMIN' || role === 'MARKETING';
}

// The roles an admin can switch between from the Accounts drawer. ADMIN and GUEST stay read-only there.
export type TeamRole = Extract<PlatformRole, 'USER' | 'MARKETING'>;

export function isTeamRole(role: PlatformRole | null | undefined): role is TeamRole {
    return role === 'USER' || role === 'MARKETING';
}
