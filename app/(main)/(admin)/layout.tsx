import { NextIntlClientProvider } from 'next-intl';
import { type ReactNode } from 'react';

import { AdminLayoutShell } from '@/components/admin/AdminLayoutShell';

// The app's root layout leaves the admin copy out of the messages it sends
// (see i18n/appMessages.ts). Rendered without a messages prop, this provider
// inherits the full catalog, so the console has everything it reads.
export default function AdminLayout({ children }: { children: ReactNode }) {
    return (
        <NextIntlClientProvider>
            <AdminLayoutShell>{children}</AdminLayoutShell>
        </NextIntlClientProvider>
    );
}
