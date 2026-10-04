import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { LegalDocumentPage } from '@/components/legal/LegalDocumentPage';
import { versionParam } from '@/lib/legalDocuments';

type PageProps = { searchParams: Promise<{ version?: string | string[] }> };

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('LegalPages');
    return { title: `StoryWall - ${t('terms')}` };
}

// Public.
export default async function TermsPage({ searchParams }: PageProps) {
    const { version } = await searchParams;
    return <LegalDocumentPage document="terms" version={versionParam(version)} />;
}
