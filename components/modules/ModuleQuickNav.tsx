'use client';

import { useCallback } from 'react';

import { moduleAnchorId } from '@/components/modules/moduleAnchorId';
import type { ShowcaseModule } from '@/hooks/useHomeModuleShowcase';

export function ModuleQuickNav({ modules, label }: { modules: ShowcaseModule[]; label: string }) {
    const handleClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
        const moduleKey = event.currentTarget.dataset.moduleKey;
        if (!moduleKey) return;
        document.getElementById(moduleAnchorId(moduleKey))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, []);

    return (
        <nav aria-label={label} className="mx-auto flex w-full max-w-3xl gap-2 overflow-x-auto touch-no-scrollbar px-5 sm:px-8">
            {modules.map((showcaseModule) => (
                <button
                    key={showcaseModule.key}
                    type="button"
                    data-module-key={showcaseModule.key}
                    onClick={handleClick}
                    className="shrink-0 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-ink-muted transition-colors hover:border-primary hover:text-primary-dark"
                >
                    {showcaseModule.name}
                </button>
            ))}
        </nav>
    );
}
