import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ReactNode } from 'react';

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('LoginPage');
    return { title: `StoryWall - ${t('tabTitle')}` };
}

export default function LoginLayout({ children }: { children: ReactNode }) {
    return children;
}
