'use client';

import '@/components/saveMyDate/editor/editor.css';

import { Dialog } from '@base-ui/react/dialog';
import { type ReactNode, useCallback } from 'react';

import { SectionSettingsDone } from '@/components/saveMyDate/editor/settings/SectionSettingsPanel';
import { SectionSettingsSheet } from '@/components/saveMyDate/editor/settings/SectionSettingsSheet';
import { letDragKeysThrough } from '@/lib/sortableKeys';

type FeedEditSheetFrameProps = {
    open: boolean;
    title: string;
    titleId?: string;
    isDesktop: boolean;
    onClose: () => void;
    children: ReactNode;
};

// Edit mode's settings surface: a panel at the right on desktop, a sheet over the lower screen on
// phones; the feed above stays live either way.
export function FeedEditSheetFrame({ open, title, titleId, isDesktop, onClose, children }: FeedEditSheetFrameProps) {
    if (!isDesktop) {
        return (
            <SectionSettingsSheet open={open} title={title} titleId={titleId} onClose={onClose}>
                {children}
            </SectionSettingsSheet>
        );
    }

    return (
        <FeedEditPanel open={open} title={title} titleId={titleId} onClose={onClose}>
            {children}
        </FeedEditPanel>
    );
}

type FeedEditPanelProps = { open: boolean; title: string; titleId?: string; onClose: () => void; children: ReactNode };

// The desktop panel, fixed at the right of the screen. It is portalled to the body: the page shell
// carries a transform, which would pin a fixed child to the shell and let it scroll away.
function FeedEditPanel({ open, title, titleId, onClose, children }: FeedEditPanelProps) {
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
                        <Dialog.Title id={titleId} className="truncate text-[14px] font-bold text-white">
                            {title}
                        </Dialog.Title>
                        <Dialog.Close render={<SectionSettingsDone />} />
                    </div>

                    {/* Settings */}
                    {children}
                </Dialog.Popup>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
