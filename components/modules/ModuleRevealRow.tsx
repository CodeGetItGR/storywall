'use client';

import { moduleAnchorId } from '@/components/modules/moduleAnchorId';
import { ModulePreviewPanel } from '@/components/modules/ModulePreviewPanel';
import type { ShowcaseModule } from '@/hooks/useHomeModuleShowcase';
import { cn } from '@/lib/utils';

export function ModuleRevealRow({ module: showcaseModule, alignment }: { module: ShowcaseModule; alignment: 'left' | 'right' }) {
    const previewOnLeft = alignment === 'left';

    return (
        <article id={moduleAnchorId(showcaseModule.key)} className="w-full scroll-mt-8 select-none">
            {/* Preview */}
            <div className={cn('flex h-120 sm:h-96', previewOnLeft ? 'justify-start' : 'justify-end')}>
                <ModulePreviewPanel previewMode ltr={previewOnLeft} module={showcaseModule} />
            </div>

            {/* Caption */}
            <div className={cn('flex px-10 pt-5', previewOnLeft ? 'justify-end' : 'justify-start')}>
                <div className={cn('max-w-sm', previewOnLeft ? 'text-right' : 'text-left')}>
                    <p className="text-xl font-semibold tracking-[0.18em] text-primary-dark uppercase">{showcaseModule.name}</p>
                    <p className="pt-2 text-sm leading-relaxed text-ink-muted sm:text-lg">{showcaseModule.detail}</p>
                </div>
            </div>
        </article>
    );
}
