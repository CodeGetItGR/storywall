'use client';

import { useTranslations } from 'next-intl';

import { ModuleQuickNav } from '@/components/modules/ModuleQuickNav';
import { ModuleRevealRow } from '@/components/modules/ModuleRevealRow';
import { ModuleScrollTopButton } from '@/components/modules/ModuleScrollTopButton';
import { BackButton } from '@/components/ui/BackButton';
import { useHomeModuleShowcase } from '@/hooks/useHomeModuleShowcase';
import { routes } from '@/lib/routes';
import type {MouseEvent} from "react";
import {useRouter} from "next/navigation";

export function ModulesContent() {
    const t = useTranslations('ModulesPage');
    const { modules } = useHomeModuleShowcase();
    const router = useRouter();

    function handleBack(event: MouseEvent<HTMLAnchorElement>) {
        event.preventDefault();
        // Plans is reached from several places (feed, sidebar, nav rail) with no single
        // canonical parent, so this returns to wherever the user actually came from rather
        // than a fixed destination — falling back to Home only when there's no history to return to.
        if (typeof window !== 'undefined' && window.history.length > 1) {
            router.back();
        } else {
            router.push(routes.home);
        }
    }


    return (
        <main className="relative min-h-full overflow-x-hidden bg-[#fff8f0]">
            {/* Brand gradient backdrop */}
            <div
                aria-hidden="true"
                className="bg-gradient-logo pointer-events-none absolute inset-0 opacity-35 mask-[linear-gradient(to_bottom,black_0%,black_72%,transparent_100%)]"
            />

            <div className="relative flex flex-col gap-10 pt-8 pb-28 lg:pt-14">
                {/* Header */}
                <section className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-5 sm:px-8">
                    <BackButton href={routes.home} onClick={handleBack} label={t('back')} />
                    <h1 className="text-3xl font-bold text-ink sm:text-4xl">{t('title')}</h1>
                </section>

                {/* Quick navigation */}
                <ModuleQuickNav modules={modules} label={t('quickNavLabel')} />

                {/* Draggable module rows */}
                <section aria-label={t('listLabel')} className="mx-auto flex w-full max-w-3xl flex-col gap-12 sm:gap-16">
                    {modules.map((showcaseModule, index) => (
                        <ModuleRevealRow key={showcaseModule.key} module={showcaseModule} alignment={index % 2 === 0 ? 'left' : 'right'} />
                    ))}
                </section>
            </div>

            {/* Scroll to top */}
            <ModuleScrollTopButton label={t('scrollTop')} />
        </main>
    );
}
