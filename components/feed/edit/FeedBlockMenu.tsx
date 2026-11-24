'use client';

import { Menu } from '@base-ui/react/menu';
import { ChevronDown, LoaderCircle, Settings2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useRef } from 'react';

import { FEED_TOOL_CLASS } from '@/components/feed/edit/feedToolClass';
import { SectionToolButton } from '@/components/saveMyDate/editor/sections/SectionToolButton';
import type { FeedBlockTool } from '@/lib/feedBlockMenu';
import { cn } from '@/lib/utils';

type FeedBlockMenuProps = {
    tools: FeedBlockTool[];
    // One of its photos is on its way.
    uploading: boolean;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSettings: () => void;
    onDelete: () => void;
};

const ICONS = { settings: Settings2, delete: X } as const;

// A block's tools behind a round chevron: icons in a white pill that hangs from it (mockup 2026-11-24). With one tool
// only, that tool is shown in the chevron's place; with none, nothing.
export function FeedBlockMenu({ tools, uploading, open, onOpenChange, onSettings, onDelete }: FeedBlockMenuProps) {
    const t = useTranslations('InvitationEditor');
    const place = useRef<HTMLDivElement>(null);
    const labels: Record<FeedBlockTool, string> = {
        settings: t('sectionSettings.open'),
        delete: t('sections.delete'),
    };
    const run = useCallback(
        (tool: FeedBlockTool) => {
            if (tool === 'settings') onSettings();
            else onDelete();
        },
        [onDelete, onSettings],
    );

    if (tools.length === 0) return null;
    if (tools.length === 1) return <SingleTool tool={tools[0]} label={labels[tools[0]]} onRun={run} />;

    return (
        // One item in the tools row: what the open menu adds must not count in its gaps.
        <div className="flex">
            <Menu.Root modal={false} open={open} onOpenChange={onOpenChange}>
                {/* Chevron */}
                <Menu.Trigger
                    render={
                        <SectionToolButton
                            label={open ? t('close') : t('sections.options')}
                            aria-busy={uploading || undefined}
                            className={cn(FEED_TOOL_CLASS, 'z-10 data-popup-open:[&_svg]:rotate-180')}
                        />
                    }
                >
                    {uploading ? (
                        <LoaderCircle className="animate-spin" aria-hidden="true" />
                    ) : (
                        <ChevronDown className="transition-transform" aria-hidden="true" />
                    )}
                </Menu.Trigger>

                {/* Tools: in the block itself, so the pill slides out from behind the chevron */}
                <Menu.Portal container={place}>
                    <Menu.Positioner side="bottom" align="center" sideOffset={-16} collisionPadding={12}>
                        <Menu.Popup className="motion-popover flex w-8 flex-col divide-y divide-black/10 rounded-full bg-white pb-1 shadow-[0_6px_20px_rgba(0,0,0,0.18)] outline-none data-[side=bottom]:pt-4 data-[side=top]:pt-1 data-[side=top]:pb-4">
                            {tools.map((tool) => (
                                <MenuTool key={tool} tool={tool} label={labels[tool]} onRun={run} />
                            ))}
                        </Menu.Popup>
                    </Menu.Positioner>
                </Menu.Portal>
            </Menu.Root>
            <div ref={place} className="contents" />
        </div>
    );
}

type ToolProps = { tool: FeedBlockTool; label: string; onRun: (tool: FeedBlockTool) => void };

function SingleTool({ tool, label, onRun }: ToolProps) {
    const run = useCallback(() => onRun(tool), [onRun, tool]);
    const Icon = ICONS[tool];

    return (
        <SectionToolButton label={label} onClick={run} className={FEED_TOOL_CLASS}>
            <Icon aria-hidden="true" />
        </SectionToolButton>
    );
}

function MenuTool({ tool, label, onRun }: ToolProps) {
    const run = useCallback(() => onRun(tool), [onRun, tool]);
    const Icon = ICONS[tool];

    return (
        <Menu.Item
            aria-label={label}
            title={label}
            label={label}
            onClick={run}
            className="relative grid h-10 w-8 cursor-pointer place-items-center text-[#2b2d31] outline-none before:absolute before:inset-y-0 before:-inset-x-1 last:rounded-b-full data-highlighted:bg-[#f2f2f2] focus-visible:shadow-[inset_0_0_0_2px_var(--smd-editor-accent)]"
        >
            <Icon className="h-4 w-4" aria-hidden="true" />
        </Menu.Item>
    );
}
