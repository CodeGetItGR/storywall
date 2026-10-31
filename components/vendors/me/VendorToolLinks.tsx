'use client';

import { ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AppLink } from '@/components/ui/AppLink';
import { VendorMeSection } from '@/components/vendors/me/VendorMeSection';
import { VendorToolArt } from '@/components/vendors/me/VendorToolArt';
import type { VendorToolKey } from '@/lib/vendors';

// Each tool as a row with a small drawing, its name and one line on what it does, so a vendor knows what they're
// opening before they tap.
export function VendorToolLinks({ tools }: { tools: { key: VendorToolKey; href: string }[] }) {
    const t = useTranslations('Vendors');

    return (
        <VendorMeSection id="vendor-tools-title" title={t('me.toolsTitle')} hint={t('hints.tools')}>
            {/* Tools */}
            <ul className="flex flex-col gap-2">
                {tools.map((tool) => (
                    <li key={tool.key}>
                        <AppLink
                            href={tool.href}
                            aria-labelledby={`vendor-tool-${tool.key}-title`}
                            aria-describedby={`vendor-tool-${tool.key}-body`}
                            className="flex items-center gap-3.5 rounded-2xl p-1.5 pr-2 focus-ring transition-colors hover:bg-surface-muted"
                        >
                            <VendorToolArt tool={tool.key} />
                            <span className="min-w-0 flex-1">
                                <span id={`vendor-tool-${tool.key}-title`} className="block text-sm font-semibold text-ink">
                                    {t(`me.tools.${tool.key}`)}
                                </span>
                                <span id={`vendor-tool-${tool.key}-body`} className="mt-0.5 block text-sm leading-snug text-ink-muted">
                                    {t(`me.toolsBody.${tool.key}`)}
                                </span>
                            </span>
                            <ChevronRight className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
                        </AppLink>
                    </li>
                ))}
            </ul>
        </VendorMeSection>
    );
}
