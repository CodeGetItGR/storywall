import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { CookiePolicySettings } from '@/components/consent/CookiePolicySettings';
import { LegalDocumentPage } from '@/components/legal/LegalDocumentPage';
import { versionParam } from '@/lib/legalDocuments';
import { routes } from '@/lib/routes';
import { canonicalAlternates } from '@/lib/seo';

type PageProps = { searchParams: Promise<{ version?: string | string[] }> };

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('LegalPages');
    return { title: `StoryWall - ${t('cookies')}`, alternates: canonicalAlternates(routes.legal.cookies()) };
}

// Public.
export default async function CookiePolicyPage({ searchParams }: PageProps) {
    const { version } = await searchParams;
    return (
        <LegalDocumentPage document="cookies" version={versionParam(version)}>
            {/* Cookie settings */}
            <CookiePolicySettings />
        </LegalDocumentPage>
    );
}
