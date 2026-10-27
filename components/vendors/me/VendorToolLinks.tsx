'use client';

import { ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AppLink } from '@/components/ui/AppLink';
import type { VendorToolKey } from '@/lib/vendors';

export function VendorToolLinks({ tools }: { tools: { key: VendorToolKey; href: string }[] }) {
    const t = useTranslations('Vendors');

    return (
        <section aria-labelledby="vendor-tools-title">
            {/* Title */}
            <h3 id="vendor-tools-title" className="text-sm font-semibold text-ink">
                {t('me.toolsTitle')}
            </h3>

            {/* Links */}
            <ul className="mt-1 divide-y divide-border">
                {tools.map((tool) => (
                    <li key={tool.key}>
                        <AppLink
                            href={tool.href}
                            className="flex min-h-12 items-center justify-between gap-3 py-3 text-sm font-semibold text-ink focus-ring"
                        >
                            {t(`me.tools.${tool.key}`)}
                            <ChevronRight className="size-4 text-ink-muted" aria-hidden="true" />
                        </AppLink>
                    </li>
                ))}
            </ul>
        </section>
    );
}
