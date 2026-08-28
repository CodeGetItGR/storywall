'use client';

import { ModulePreviewPanel } from '@/components/modules/ModulePreviewPanel';
import type { ShowcaseModule } from '@/hooks/useHomeModuleShowcase';
import {cn} from "@/lib/utils";

export function ModuleRevealRow({ module: showcaseModule, alignment }: { module: ShowcaseModule; alignment: 'left' | 'right' }) {
    const descriptionFirst = alignment === 'left';

    return (
        <article className={cn("w-full flex h-120 select-none sm:h-96 ", {"justify-end" : alignment === 'right', "justify-start": alignment === 'left'})}>
            <ModulePreviewPanel previewMode ltr={descriptionFirst} module={showcaseModule} />
        </article>
    );
}
