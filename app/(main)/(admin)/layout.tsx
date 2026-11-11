import { NextIntlClientProvider } from 'next-intl';
import { type ReactNode } from 'react';

// The app's root layout leaves the admin copy out of the messages it sends
// (see i18n/appMessages.ts). Rendered without a messages prop, this provider
// inherits the full catalog, so every admin page has everything it reads.
// Each admin page brings its own frame: the console's in admin/(console), Save my date's in admin/save-my-date.
export default function AdminLayout({ children }: { children: ReactNode }) {
    return <NextIntlClientProvider>{children}</NextIntlClientProvider>;
}
