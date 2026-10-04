import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { Logo } from '@/components/common/Logo';
import { LEGAL_PAGE_LINKS, type LegalPageKey } from '@/lib/legalDocuments';
import { cn } from '@/lib/utils';

// The frame of every public legal page. The body never scrolls (RootDocument locks it to the
// viewport), so this is the page's scroll container.
export function LegalPageShell({ current, children }: { current: LegalPageKey; children: ReactNode }) {
    const t = useTranslations('LegalPages');

    return (
        <div className="h-full overflow-y-auto overscroll-contain bg-background">
            {/* Header */}
            <header className="mx-auto w-full max-w-3xl px-4 pt-6">
                <Link href="/" aria-label={t('home')} className="inline-flex">
                    <Logo iconClassName="h-7 w-auto" wordmarkClassName="h-5 w-auto" />
                </Link>
            </header>

            {/* Content */}
            <main className="mx-auto w-full max-w-3xl px-4 pt-8 pb-12">{children}</main>

            {/* Legal links */}
            <footer className="mx-auto w-full max-w-3xl px-4 pb-10">
                <nav aria-label={t('nav')} className="flex flex-wrap gap-x-5 gap-y-2 border-t border-border/70 pt-6 text-xs font-semibold">
                    {LEGAL_PAGE_LINKS.map(({ key, href }) => (
                        <Link
                            key={key}
                            href={href}
                            aria-current={key === current ? 'page' : undefined}
                            className={cn('hover:text-ink', key === current ? 'text-ink' : 'text-ink-muted')}
                        >
                            {t(key)}
                        </Link>
                    ))}
                </nav>
            </footer>
        </div>
    );
}
