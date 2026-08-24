import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ReactNode } from 'react';

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('RegisterPage');
    return { title: `StoryWall - ${t('tabTitle')}` };
}

export default function RegisterLayout({ children }: { children: ReactNode }) {
    return children;
}
