import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { NO_INDEX } from '@/lib/seo';

// The demo renders only in the browser, so search engines see an empty page.
export const metadata: Metadata = { robots: NO_INDEX };

export default function DemoLayout({ children }: { children: ReactNode }) {
    return children;
}
