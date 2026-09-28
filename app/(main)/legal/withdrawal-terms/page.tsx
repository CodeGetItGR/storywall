import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { MarkdownDocument } from '@/components/legal/MarkdownDocument';
import { getServerLocale } from '@/i18n/serverLocale';
import { endpoints } from '@/lib/api/endpoints';
import { serverPublicGet } from '@/lib/api/serverFetch';
import type { WithdrawalTermsDto } from '@/lib/api/types';

type PageProps = { searchParams: Promise<{ version?: string | string[] }> };

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('WithdrawalTermsPage');
    return { title: `StoryWall - ${t('title')}` };
}

async function loadTerms(version: string | null): Promise<WithdrawalTermsDto | null> {
    // The backend only knows en and el; anything else would fall back to en anyway.
    const locale = (await getServerLocale()) === 'el' ? 'el' : 'en';
    try {
        return await serverPublicGet<WithdrawalTermsDto>(endpoints.legal.withdrawalTerms({ version, locale }));
    } catch {
        return null;
    }
}

// Public: the withdrawal information and the model withdrawal form. No version
// means the current terms; a paid order links the version its checkout acknowledged.
export default async function WithdrawalTermsPage({ searchParams }: PageProps) {
    const { version } = await searchParams;
    const t = await getTranslations('WithdrawalTermsPage');
    const terms = await loadTerms(typeof version === 'string' && version ? version : null);

    return (
        <main className="mx-auto w-full max-w-3xl px-4 pt-8 pb-16">
            {terms ? (
                <>
                    {/* Version */}
                    <p className="text-xs font-semibold text-ink-faint">{t('version', { version: terms.version })}</p>

                    {/* Withdrawal information */}
                    <MarkdownDocument source={terms.withdrawalInformation} className="mt-3" />

                    {/* Model form */}
                    <MarkdownDocument source={terms.modelForm} className="mt-10 border-t border-border/70 pt-8" />
                </>
            ) : (
                /* Unavailable */
                <p className="text-sm text-ink-muted">{t('unavailable')}</p>
            )}
        </main>
    );
}
