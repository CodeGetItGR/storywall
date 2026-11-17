import { type ReactNode } from 'react';

import { AdminLayoutShell } from '@/components/admin/AdminLayoutShell';

// The console at /admin: its sidebar, top bar and sign-out.
export default function AdminConsoleLayout({ children }: { children: ReactNode }) {
    return <AdminLayoutShell>{children}</AdminLayoutShell>;
}
