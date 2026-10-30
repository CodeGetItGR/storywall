import type { PlatformRole } from '@/lib/api/types';

// A signed-in account (not a guest): MARKETING is a USER with console access on top.
export function isAccountRole(role: PlatformRole | null | undefined): boolean {
    return role === 'USER' || role === 'ADMIN' || role === 'MARKETING';
}
