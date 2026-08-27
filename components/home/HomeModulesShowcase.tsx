'use client';

import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { HomeHorizontalScroller } from '@/components/home/HomeHorizontalScroller';
import { HomeModuleDetailSheet } from '@/components/home/HomeModuleDetailSheet';
import { modulePreviews } from '@/components/home/modulePreviews';
import { type ShowcaseModule, useHomeModuleShowcase } from '@/hooks/useHomeModuleShowcase';
import { routes } from '@/lib/routes';

function ModuleCard({ module: showcaseModule, onOpenAction }: { module: ShowcaseModule; onOpenAction: (moduleKey: string) => void }) {
    const Preview = modulePreviews[showcaseModule.key];

    const handleClick = useCallback(() => {
        onOpenAction(showcaseModule.key);
    }, [onOpenAction, showcaseModule.key]);

    return (
        <button
            type="button"
            onClick={handleClick}
            className="group/module flex w-56 shrink-0 flex-col overflow-hidden rounded-[1.5rem] border border-border bg-card text-left shadow-[0_18px_36px_rgba(35,28,22,0.06)] transition-all hover:-translate-y-0.5 hover:shadow-[0_24px_48px_rgba(35,28,22,0.1)]"
        >
            {/* Screen replica */}
            <span className="relative block border-b border-border/60">
                {Preview && <Preview variant="card" />}
                <span className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-linear-to-t from-card to-transparent" />
            </span>

            {/* Details */}
            <span className="flex flex-1 items-start justify-between gap-2 p-4">
                <span className="flex flex-col gap-1">
                    <span className="text-sm font-semibold text-ink">{showcaseModule.name}</span>
                    <span className="text-xs leading-5 text-ink-muted">{showcaseModule.summary}</span>
                </span>
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-muted text-ink-muted transition-colors group-hover/module:bg-primary-light group-hover/module:text-primary">
                    <ArrowUpRight className="h-3.5 w-3.5" />
                </span>
            </span>
        </button>
    );
}

export function HomeModulesShowcase() {
    const t = useTranslations('HomePage');
    const { modules, openModule, handleOpenModule, handleCloseModule } = useHomeModuleShowcase();

    if (modules.length === 0) return null;

    return (
        <section aria-labelledby="home-modules-heading" className="flex w-full flex-col gap-3">
            {/* Section heading */}
            <div className="flex items-end justify-between px-4 sm:px-8 lg:px-14 2xl:px-20">
                <h2 id="home-modules-heading" className="text-xs font-semibold tracking-wide text-ink-faint uppercase">
                    {t('modules.title')}
                </h2>
                <Link href={routes.plans()} className="shrink-0 text-xs font-semibold text-brand">
                    {t('modules.seePlans')}
                </Link>
            </div>

            {/* Module cards */}
            <HomeHorizontalScroller previousLabel={t('carousel.previous')} nextLabel={t('carousel.next')}>
                {modules.map((showcaseModule) => (
                    <ModuleCard key={showcaseModule.key} module={showcaseModule} onOpenAction={handleOpenModule} />
                ))}
            </HomeHorizontalScroller>

            {/* Module detail */}
            <HomeModuleDetailSheet module={openModule} onCloseAction={handleCloseModule} />
        </section>
    );
}
