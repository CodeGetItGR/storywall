import { getTranslations } from 'next-intl/server';

import { LegalPageShell } from '@/components/legal/LegalPageShell';
import { MarkdownDocument } from '@/components/legal/MarkdownDocument';
import type { LegalDocumentSlug } from '@/lib/api/types';
import { loadLegalDocument } from '@/lib/legalDocuments';

// One backend-served legal page: the version in force, or an older one by ?version=.
export async function LegalDocumentPage({ document, version }: { document: LegalDocumentSlug; version: string | null }) {
    const t = await getTranslations('LegalPages');
    const page = await loadLegalDocument(document, version);

    return (
        <LegalPageShell current={document}>
            {page ? (
                /* Document */
                <MarkdownDocument source={page.markdown} />
            ) : (
                /* Unavailable */
                <p className="text-sm text-ink-muted">{t('unavailable')}</p>
            )}
        </LegalPageShell>
    );
}
