import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { type ReactNode } from 'react';

import { SaveMyDateAdminShell } from '@/components/admin/saveMyDate/SaveMyDateAdminShell';
import { showsSaveMyDate } from '@/lib/saveMyDateRelease';
import { NO_INDEX } from '@/lib/seo';

export const metadata: Metadata = { robots: NO_INDEX };

// The Save my date admin: its own menu, with a link back to the console. 404s where Save my date doesn't show.
export default function SaveMyDateAdminLayout({ children }: { children: ReactNode }) {
    if (!showsSaveMyDate()) notFound();
    return <SaveMyDateAdminShell>{children}</SaveMyDateAdminShell>;
}
