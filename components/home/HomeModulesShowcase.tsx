'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { HomeHorizontalScroller } from '@/components/home/HomeHorizontalScroller';
import { HomeModuleDetailSheet } from '@/components/home/HomeModuleDetailSheet';
import { ModuleShowcaseCard } from '@/components/modules/ModuleShowcaseCard';
import { useHomeModuleShowcase } from '@/hooks/useHomeModuleShowcase';
import { routes } from '@/lib/routes';

export function HomeModulesShowcase() {
    const t = useTranslations('HomePage');
    const { modules, openModule, handleOpenModule, handleCloseModule } = useHomeModuleShowcase({ limit: 3 });

    if (modules.length === 0) return null;

    return (
        <section aria-labelledby="home-modules-heading" className="flex w-full flex-col gap-3">
            {/* Section heading */}
            <div className="flex items-end justify-between px-4 sm:px-8 lg:px-14 2xl:px-20">
                <h2 id="home-modules-heading" className="text-xs font-semibold tracking-wide text-ink-faint uppercase">
                    {t('modules.title')}
                </h2>
                <Link href={routes.modules} className="shrink-0 text-xs font-semibold text-brand">
                    {t('modules.viewAll')}
                </Link>
            </div>

            {/* Module cards */}
            <HomeHorizontalScroller previousLabel={t('carousel.previous')} nextLabel={t('carousel.next')}>
                {modules.map((showcaseModule) => (
                    <ModuleShowcaseCard key={showcaseModule.key} module={showcaseModule} onOpenAction={handleOpenModule} />
                ))}
            </HomeHorizontalScroller>

            {/* Module detail */}
            <HomeModuleDetailSheet module={openModule} onCloseAction={handleCloseModule} />
        </section>
    );
}
