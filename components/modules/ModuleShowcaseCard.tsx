'use client';

import { ArrowUpRight } from 'lucide-react';
import { useCallback } from 'react';

import { modulePreviews } from '@/components/home/modulePreviews';
import type { ShowcaseModule } from '@/hooks/useHomeModuleShowcase';
import { cn } from '@/lib/utils';

type ModuleShowcaseCardSize = 'compact' | 'page';
type ModuleShowcaseCardCopy = 'summary' | 'detail';

export function ModuleShowcaseCard({
    module: showcaseModule,
    onOpenAction,
    size = 'compact',
    copy = 'summary',
}: {
    module: ShowcaseModule;
    onOpenAction: (moduleKey: string) => void;
    size?: ModuleShowcaseCardSize;
    copy?: ModuleShowcaseCardCopy;
}) {
    const Preview = modulePreviews[showcaseModule.key];
    const description = copy === 'detail' ? showcaseModule.detail : showcaseModule.summary;

    const handleClick = useCallback(() => {
        onOpenAction(showcaseModule.key);
    }, [onOpenAction, showcaseModule.key]);

    return (
        <button
            type="button"
            onClick={handleClick}
            className={cn(
                'group/module flex shrink-0 flex-col overflow-hidden rounded-[1.5rem] border border-border bg-card text-left transition-all hover:-translate-y-0.5 hover:shadow-[0_24px_48px_rgba(35,28,22,0.1)]',
                size === 'page' ? 'w-80 snap-center shadow-[0_16px_44px_rgba(35,28,22,0.09)]' : 'w-56'
            )}
        >
            {/* Preview */}
            <span className="relative block border-b border-border/60">
                {Preview && <Preview variant={size === 'page' ? 'page' : 'card'} />}
                <span className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-linear-to-t from-card to-transparent" />
            </span>

            {/* Details */}
            <span className="flex flex-1 items-start justify-between gap-2 p-4">
                <span className="flex flex-col gap-1">
                    <span className="text-sm font-semibold text-ink">{showcaseModule.name}</span>
                    <span className={cn('text-xs text-ink-muted', copy === 'detail' ? 'leading-5' : 'leading-5')}>{description}</span>
                </span>
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-muted text-ink-muted transition-colors group-hover/module:bg-primary-light group-hover/module:text-primary">
                    <ArrowUpRight className="h-3.5 w-3.5" />
                </span>
            </span>
        </button>
    );
}
