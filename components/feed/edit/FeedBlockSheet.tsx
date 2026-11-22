'use client';

import '@/components/saveMyDate/editor/editor.css';

import { Dialog } from '@base-ui/react/dialog';
import { ChevronRight } from 'lucide-react';
import { type ReactNode, useCallback } from 'react';

import { SectionSettingsDone, SectionSettingsPanel } from '@/components/saveMyDate/editor/settings/SectionSettingsPanel';
import { SectionSettingsSheet } from '@/components/saveMyDate/editor/settings/SectionSettingsSheet';
import type { SettingsScope } from '@/hooks/useSectionSettingsPanel';
import type { SettingsGroup } from '@/lib/invitation/sectionSettings';
import type { SettingsPart } from '@/lib/settingsPreview';
import { letDragKeysThrough } from '@/lib/sortableKeys';

type FeedBlockSheetProps = {
    title: string;
    open: boolean;
    scope: SettingsScope | null;
    groups: SettingsGroup[];
    parts: SettingsPart[];
    partLabels: Record<SettingsPart, string>;
    isDesktop: boolean;
    onOpenPart: (part: SettingsPart) => void;
    onClose: () => void;
};

// The pencil's sheet: the event fields the block shows, then its style. A panel at the right on
// desktop, a sheet over the lower screen on phones; the feed above stays live either way.
export function FeedBlockSheet({ title, open, scope, groups, parts, partLabels, isDesktop, onOpenPart, onClose }: FeedBlockSheetProps) {
    const body = (
        <div className="flex flex-col gap-5">
            {/* Event details */}
            {parts.length > 0 && (
                <div className="flex flex-col gap-1.5">
                    {parts.map((part) => (
                        <FeedBlockPartRow key={part} part={part} label={partLabels[part]} onOpen={onOpenPart} />
                    ))}
                </div>
            )}

            {/* Style */}
            {scope && groups.length > 0 && <SectionSettingsPanel scope={scope} groups={groups} />}
        </div>
    );

    if (!isDesktop) {
        return (
            <SectionSettingsSheet open={open} title={title} onClose={onClose}>
                {body}
            </SectionSettingsSheet>
        );
    }

    return (
        <FeedBlockPanel open={open} title={title} onClose={onClose}>
            {body}
        </FeedBlockPanel>
    );
}

type FeedBlockPanelProps = { open: boolean; title: string; onClose: () => void; children: ReactNode };

// The desktop panel, fixed at the right of the screen. It is portalled to the body: the page shell
// carries a transform, which would pin a fixed child to the shell and let it scroll away.
function FeedBlockPanel({ open, title, onClose, children }: FeedBlockPanelProps) {
    const onOpenChange = useCallback((next: boolean) => !next && onClose(), [onClose]);

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange} modal={false} disablePointerDismissal>
            <Dialog.Portal>
                <Dialog.Popup
                    onKeyDown={letDragKeysThrough}
                    className="smd-editor fixed top-24 right-4 z-40 flex max-h-[calc(100svh-7rem)] w-72 flex-col gap-3 overflow-y-auto rounded-[15px] border border-(--smd-editor-panel-line) bg-(--smd-editor-panel) p-3 text-[12.5px] text-(--smd-editor-text) shadow-[0_12px_30px_rgba(0,0,0,0.25)] transition-[translate,opacity] duration-200 outline-none data-ending-style:translate-x-4 data-ending-style:opacity-0 data-starting-style:translate-x-4 data-starting-style:opacity-0"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between gap-3">
                        <Dialog.Title className="truncate text-[14px] font-bold text-white">{title}</Dialog.Title>
                        <Dialog.Close render={<SectionSettingsDone />} />
                    </div>

                    {/* Settings */}
                    {children}
                </Dialog.Popup>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

type FeedBlockPartRowProps = { part: SettingsPart; label: string; onOpen: (part: SettingsPart) => void };

// One event field, opened in the Settings page's own editor.
function FeedBlockPartRow({ part, label, onOpen }: FeedBlockPartRowProps) {
    const open = useCallback(() => onOpen(part), [onOpen, part]);

    return (
        <button
            type="button"
            onClick={open}
            className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg bg-(--smd-editor-control) px-3 text-left text-[13px] text-(--smd-editor-text) transition-colors hover:bg-white/10"
        >
            {label}
            <ChevronRight className="h-4 w-4 text-(--smd-editor-muted)" aria-hidden="true" />
        </button>
    );
}
