'use client';

import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ModuleDescriptionPanel } from '@/components/modules/ModuleDescriptionPanel';
import { ModulePreviewPanel } from '@/components/modules/ModulePreviewPanel';
import type { ShowcaseModule } from '@/hooks/useHomeModuleShowcase';
import { type ModuleDescriptionSide, useModuleReveal } from '@/hooks/useModuleReveal';
import { cn } from '@/lib/utils';

export function ModuleRevealRow({ module: showcaseModule, descriptionSide }: { module: ShowcaseModule; descriptionSide: ModuleDescriptionSide }) {
    const t = useTranslations('ModulesPage');
    const { emblaRef, isDescriptionVisible, togglePanel } = useModuleReveal(descriptionSide);
    const descriptionFirst = descriptionSide === 'left';
    const pointsRight = descriptionFirst !== isDescriptionVisible;

    return (
        <article className="w-full">
            {/* Draggable preview and description */}
            <div ref={emblaRef} className="cursor-grab overflow-hidden active:cursor-grabbing">
                <div className="flex h-84 touch-pan-y select-none sm:h-96">
                    {descriptionFirst ? (
                        <>
                            <ModuleDescriptionPanel module={showcaseModule} />
                            <ModulePreviewPanel module={showcaseModule} />
                        </>
                    ) : (
                        <>
                            <ModulePreviewPanel module={showcaseModule} />
                            <ModuleDescriptionPanel module={showcaseModule} />
                        </>
                    )}
                </div>
            </div>

            {/* Module control */}
            <div className={cn('mt-3 flex px-5', descriptionFirst ? 'justify-end' : 'justify-start')}>
                <button
                    type="button"
                    onClick={togglePanel}
                    aria-label={t(isDescriptionVisible ? 'showPreview' : 'showDescription', { name: showcaseModule.name })}
                    className={cn(
                        'group flex items-center gap-3 rounded-full px-2 py-1.5 text-left text-ink transition-colors hover:text-primary-dark',
                        descriptionFirst && 'flex-row-reverse text-right'
                    )}
                >
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-card shadow-[0_8px_24px_rgba(70,44,30,0.13)] transition-transform group-hover:scale-105">
                        {pointsRight ? <ArrowRight className="h-5 w-5" aria-hidden="true" /> : <ArrowLeft className="h-5 w-5" aria-hidden="true" />}
                    </span>
                    <span className="text-base font-bold sm:text-lg">{showcaseModule.name}</span>
                </button>
            </div>
        </article>
    );
}
