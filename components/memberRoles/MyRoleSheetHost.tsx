'use client';

import { MyRoleSheet } from '@/components/memberRoles/MyRoleSheet';
import { useMyRoleSheet } from '@/hooks/useMyRoleSheet';

// Mounted once in the event layout: chips, the tools menu and the one-time
// prompt all open the same sheet.
export function MyRoleSheetHost() {
    const sheet = useMyRoleSheet();

    if (!sheet.open || !sheet.eventId || !sheet.member) return null;
    return <MyRoleSheet eventId={sheet.eventId} member={sheet.member} onCloseAction={sheet.close} />;
}
