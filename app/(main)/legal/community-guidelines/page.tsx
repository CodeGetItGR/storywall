import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { LegalPageShell } from '@/components/legal/LegalPageShell';
import { MarkdownDocument } from '@/components/legal/MarkdownDocument';
import { getServerLocale } from '@/i18n/serverLocale';
import { endpoints } from '@/lib/api/endpoints';
import { serverPublicGet } from '@/lib/api/serverFetch';
import type { CommunityGuidelinesDto } from '@/lib/api/types';

type PageProps = { searchParams: Promise<{ version?: string | string[] }> };

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('CommunityGuidelinesPage');
    return { title: `StoryWall - ${t('title')}` };
}

async function loadGuidelines(version: string | null): Promise<CommunityGuidelinesDto | null> {
    // The backend only knows en and el; anything else would fall back to en anyway.
    const locale = (await getServerLocale()) === 'el' ? 'el' : 'en';
    try {
        return await serverPublicGet<CommunityGuidelinesDto>(endpoints.legal.communityGuidelines({ version, locale }));
    } catch {
        return null;
    }
}

// Public: the Community Guidelines in force, or an older version by ?version= (what
// someone accepted at the time).
export default async function CommunityGuidelinesPage({ searchParams }: PageProps) {
    const { version } = await searchParams;
    const t = await getTranslations('CommunityGuidelinesPage');
    const guidelines = await loadGuidelines(typeof version === 'string' && version ? version : null);

    return (
        <LegalPageShell current="communityGuidelines">
            {guidelines ? (
                /* Guidelines */
                <MarkdownDocument source={guidelines.markdown} />
            ) : (
                /* Unavailable */
                <p className="text-sm text-ink-muted">{t('unavailable')}</p>
            )}
        </LegalPageShell>
    );
}
