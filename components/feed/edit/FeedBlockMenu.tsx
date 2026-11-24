'use client';

import { Menu } from '@base-ui/react/menu';
import { ChevronDown, Droplet, ImageIcon, LoaderCircle, Settings2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ChangeEvent, useCallback, useRef } from 'react';

import { SectionToolButton } from '@/components/saveMyDate/editor/sections/SectionToolButton';
import type { FeedBackgroundKind, FeedBlockTool } from '@/lib/feedBlockMenu';
import { PHOTO_ACCEPT } from '@/lib/invitation/photoUpload';

type FeedBlockMenuProps = {
    tools: FeedBlockTool[];
    // The section has a background photo: its tool opens the photo's sheet instead of the file picker.
    hasPhoto: boolean;
    // A background photo is on its way.
    uploading: boolean;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSettings: () => void;
    onBackground: (kind: FeedBackgroundKind) => void;
    onPickPhoto: (file: File) => void;
    onDelete: () => void;
};

const ICONS = { settings: Settings2, photo: ImageIcon, color: Droplet, delete: X } as const;

// A block's tools behind a round chevron: icons in a white pill that hangs from it (mockup 2026-11-24). With one tool
// only, that tool is shown in the chevron's place; with none, nothing.
export function FeedBlockMenu({ tools, hasPhoto, uploading, open, onOpenChange, onSettings, onBackground, onPickPhoto, onDelete }: FeedBlockMenuProps) {
    const t = useTranslations('InvitationEditor');
    const tFeed = useTranslations('FeedEditor');
    const input = useRef<HTMLInputElement>(null);
    const place = useRef<HTMLDivElement>(null);
    const labels: Record<FeedBlockTool, string> = {
        settings: t('sectionSettings.open'),
        photo: tFeed('background.image'),
        color: tFeed('background.color'),
        delete: t('sections.delete'),
    };
    const run = useCallback(
        (tool: FeedBlockTool) => {
            if (tool === 'settings') onSettings();
            else if (tool === 'delete') onDelete();
            else if (tool === 'photo' && !hasPhoto) input.current?.click();
            else onBackground(tool);
        },
        [hasPhoto, onBackground, onDelete, onSettings],
    );
    const pick = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) onPickPhoto(file);
        },
        [onPickPhoto],
    );

    if (tools.length === 0) return null;
    if (tools.length === 1) return <SingleTool tool={tools[0]} label={labels[tools[0]]} onRun={run} />;

    return (
        <>
            <Menu.Root modal={false} open={open} onOpenChange={onOpenChange}>
                {/* Chevron */}
                <Menu.Trigger
                    render={
                        <SectionToolButton
                            label={open ? t('close') : t('sections.options')}
                            aria-busy={uploading || undefined}
                            className="relative z-10 data-popup-open:[&_svg]:rotate-180"
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
                    <Menu.Positioner side="bottom" align="center" sideOffset={-20} collisionPadding={12}>
                        <Menu.Popup className="motion-popover flex w-10 flex-col divide-y divide-black/10 overflow-hidden rounded-full bg-white pb-1 shadow-[0_6px_20px_rgba(0,0,0,0.18)] outline-none data-[side=bottom]:pt-5 data-[side=top]:pt-1 data-[side=top]:pb-5">
                            {tools.map((tool) => (
                                <MenuTool key={tool} tool={tool} label={labels[tool]} onRun={run} />
                            ))}
                        </Menu.Popup>
                    </Menu.Positioner>
                </Menu.Portal>
            </Menu.Root>
            <div ref={place} className="contents" />

            {/* The background photo's file picker, opened from its tool */}
            {tools.includes('photo') && (
                <input ref={input} type="file" accept={PHOTO_ACCEPT} aria-label={labels.photo} tabIndex={-1} onChange={pick} className="hidden" />
            )}
        </>
    );
}

type ToolProps = { tool: FeedBlockTool; label: string; onRun: (tool: FeedBlockTool) => void };

function SingleTool({ tool, label, onRun }: ToolProps) {
    const run = useCallback(() => onRun(tool), [onRun, tool]);
    const Icon = ICONS[tool];

    return (
        <SectionToolButton label={label} onClick={run}>
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
            className="grid h-10 w-10 cursor-pointer place-items-center text-[#2b2d31] outline-none data-highlighted:bg-[#f2f2f2] focus-visible:shadow-[inset_0_0_0_2px_var(--smd-editor-accent)]"
        >
            <Icon className={tool === 'color' ? 'h-4.5 w-4.5 fill-current' : 'h-4.5 w-4.5'} aria-hidden="true" />
        </Menu.Item>
    );
}
