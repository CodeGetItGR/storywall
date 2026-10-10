import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ReactNode } from 'react';

import { NO_INDEX } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('LoginPage');
    return { title: `StoryWall - ${t('tabTitle')}`, robots: NO_INDEX };
}

export default function LoginLayout({ children }: { children: ReactNode }) {
    return children;
}
