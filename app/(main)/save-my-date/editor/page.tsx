import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { showsSaveMyDate } from '@/lib/saveMyDateRelease';
import { NO_INDEX } from '@/lib/seo';

import StartInvitationDraftPage from './PageClient';

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('InvitationEditor');
    return { title: t('metaTitle'), robots: NO_INDEX };
}

type PageProps = { searchParams: Promise<{ theme?: string | string[] }> };

// ?theme=<slug> starts a draft from that theme and opens it in the editor. Signed in only (proxy.ts).
export default async function Page({ searchParams }: PageProps) {
    if (!showsSaveMyDate()) notFound();
    const { theme } = await searchParams;
    if (typeof theme !== 'string' || !theme) notFound();

    return <StartInvitationDraftPage themeSlug={theme} />;
}
