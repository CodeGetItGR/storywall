import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';

import { NO_INDEX } from '@/lib/seo';

// The demo renders only in the browser, so search engines see an empty page.
export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('Demo');
    return { title: t('metaTitle'), description: t('metaDescription'), robots: NO_INDEX };
}

export default function DemoLayout({ children }: { children: ReactNode }) {
    return children;
}
