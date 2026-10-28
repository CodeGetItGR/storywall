import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';

import type { Locale } from '@/i18n/config';
import { buildLegalPageMetadata } from '@/lib/seo';

export type LegalPageMetaKey = 'terms' | 'privacy' | 'cookies' | 'withdrawal' | 'communityGuidelines' | 'contact';

// Shared by the contact and legal pages. `path` is the page's English path; the Greek page
// gets its /el URL. `title` is the page's name, already translated.
export async function getLegalPageMetadata(path: string, key: LegalPageMetaKey, title: string): Promise<Metadata> {
    const locale = (await getLocale()) as Locale;
    const t = await getTranslations({ locale, namespace: 'LegalPages.descriptions' });
    const meta = await getTranslations({ locale, namespace: 'LandingPage.meta' });
    return buildLegalPageMetadata(locale, path, {
        title: `${title} | ${meta('siteName')}`,
        description: t(key),
        siteName: meta('siteName'),
        imageAlt: meta('imageAlt'),
    });
}
