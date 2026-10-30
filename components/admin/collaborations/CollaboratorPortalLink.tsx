'use client';

import { Copy } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useCopyText } from '@/hooks/useCopyText';
import type { CollaboratorResponseDto } from '@/lib/api/types';
import { routes } from '@/lib/routes';
import { absoluteUrl } from '@/lib/seo';

// Every partner has the same page address; it opens for the account signed in with the contact email.
export function CollaboratorPortalLink({ collaborator }: { collaborator: CollaboratorResponseDto }) {
    const t = useTranslations('AdminPage.collaborations.portal');
    const url = absoluteUrl(routes.partner);
    const { copied, copy } = useCopyText(url);

    return (
        <section className="space-y-3">
            {/* Partner page */}
            <div>
                <h3 className="text-base font-semibold text-ink">{t('title')}</h3>
                <p className="mt-0.5 text-sm text-ink-muted">{t('signInAs', { email: collaborator.contactEmail })}</p>
            </div>

            {/* Link */}
            <div className="flex flex-wrap items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-md bg-canvas px-2.5 py-2 font-mono text-xs text-ink">{url}</code>
                <button
                    type="button"
                    onClick={copy}
                    className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border px-3.5 text-sm font-semibold text-ink-muted transition-colors hover:bg-canvas hover:text-ink"
                >
                    <Copy className="h-4 w-4" aria-hidden="true" />
                    {copied ? t('copied') : t('copy')}
                </button>
            </div>
        </section>
    );
}
