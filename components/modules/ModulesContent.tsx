'use client';

import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { ModuleRevealRow } from '@/components/modules/ModuleRevealRow';
import { useHomeModuleShowcase } from '@/hooks/useHomeModuleShowcase';
import { routes } from '@/lib/routes';

export function ModulesContent() {
    const t = useTranslations('ModulesPage');
    const { modules } = useHomeModuleShowcase();

    return (
        <main className="relative min-h-full overflow-x-hidden bg-[#fff8f0]">
            {/* Brand gradient backdrop */}
            <div
                aria-hidden="true"
                className="bg-gradient-logo pointer-events-none absolute inset-0 opacity-35 mask-[linear-gradient(to_bottom,black_0%,black_72%,transparent_100%)]"
            />

            <div className="relative flex flex-col gap-10 pt-8 pb-28 lg:pt-14">
                {/* Header */}
                <section className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-5 sm:px-8">
                    <h1 className="text-3xl font-bold text-ink sm:text-4xl">{t('title')}</h1>
                    <Link
                        href={routes.plans()}
                        className="inline-flex shrink-0 items-center gap-2 rounded-full bg-card px-4 py-2 text-sm font-semibold text-ink shadow-[0_12px_32px_rgba(35,28,22,0.1)] transition-colors hover:bg-primary-light hover:text-primary-dark"
                    >
                        <span>{t('plans')}</span>
                        <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                </section>

                {/* Draggable module rows */}
                <section aria-label={t('listLabel')} className="mx-auto flex w-full max-w-3xl flex-col gap-12 sm:gap-16">
                    {modules.map((showcaseModule, index) => (
                        <ModuleRevealRow key={showcaseModule.key} module={showcaseModule} descriptionSide={index % 2 === 0 ? 'left' : 'right'} />
                    ))}
                </section>
            </div>
        </main>
    );
}
