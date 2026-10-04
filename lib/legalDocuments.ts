import { getServerLocale } from '@/i18n/serverLocale';
import { endpoints } from '@/lib/api/endpoints';
import { serverPublicGet } from '@/lib/api/serverFetch';
import type { LegalDocumentDto, LegalDocumentSlug } from '@/lib/api/types';
import { routes } from '@/lib/routes';

// The legal pages linked from every legal page's footer, in display order. `key` is the
// LegalPages translation key and the value a page passes as `current`.
export const LEGAL_PAGE_LINKS = [
    { key: 'terms', href: routes.legal.terms() },
    { key: 'privacy', href: routes.legal.privacy() },
    { key: 'cookies', href: routes.legal.cookies() },
    { key: 'withdrawal', href: routes.legal.withdrawalTerms() },
    { key: 'communityGuidelines', href: routes.legal.communityGuidelines() },
    { key: 'reportContent', href: routes.reportContent },
    { key: 'contact', href: routes.contact },
] as const;

export type LegalPageKey = (typeof LEGAL_PAGE_LINKS)[number]['key'];

// A ?version= value worth asking for: a single non-empty string.
export function versionParam(version: string | string[] | undefined): string | null {
    return typeof version === 'string' && version ? version : null;
}

// Null when Spring can't serve it; the page then shows its unavailable state.
export async function loadLegalDocument(document: LegalDocumentSlug, version: string | null): Promise<LegalDocumentDto | null> {
    // The backend only knows en and el; anything else would fall back to en anyway.
    const locale = (await getServerLocale()) === 'el' ? 'el' : 'en';
    try {
        return await serverPublicGet<LegalDocumentDto>(endpoints.legal.document({ document, version, locale }));
    } catch {
        return null;
    }
}
