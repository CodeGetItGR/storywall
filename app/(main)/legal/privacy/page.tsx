import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { LegalDocumentPage } from '@/components/legal/LegalDocumentPage';
import { versionParam } from '@/lib/legalDocuments';
import { routes } from '@/lib/routes';
import { canonicalAlternates } from '@/lib/seo';

type PageProps = { searchParams: Promise<{ version?: string | string[] }> };

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('LegalPages');
    return { title: `StoryWall - ${t('privacy')}`, alternates: canonicalAlternates(routes.legal.privacy()) };
}

// Public.
export default async function PrivacyPolicyPage({ searchParams }: PageProps) {
    const { version } = await searchParams;
    return <LegalDocumentPage document="privacy" version={versionParam(version)} />;
}
