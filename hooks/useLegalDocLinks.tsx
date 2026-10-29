'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { AppLink } from '@/components/ui/AppLink';
import { routes } from '@/lib/routes';

// The <terms>, <guidelines> and <privacy> tags of an acceptance label. The documents
// open in a new tab, so a half-filled form survives the read.
export function useLegalDocLinks() {
    const t = useTranslations('AcceptanceCheckboxes');

    const docLink = (href: string) =>
        function DocLink(chunks: ReactNode) {
            return (
                <AppLink href={href} target="_blank" rel="noopener" className="font-semibold underline hover:text-ink">
                    {chunks} <span className="sr-only">{t('opensInNewTab')}</span>
                </AppLink>
            );
        };

    return {
        terms: docLink(routes.legal.terms()),
        guidelines: docLink(routes.legal.communityGuidelines()),
        privacy: docLink(routes.legal.privacy()),
    };
}
