'use client';

import { Dialog } from '@base-ui/react/dialog';
import { type ReactNode, useCallback } from 'react';

import { SectionSettingsDone } from '@/components/saveMyDate/editor/settings/SectionSettingsPanel';

type SectionSettingsSheetProps = {
    open: boolean;
    title: string;
    onClose: () => void;
    children: ReactNode;
};

// A section's settings on phones and tablets: a sheet over the lower part of
// the screen. The canvas above stays in view and live, so a change shows as
// it's made; tapping the canvas leaves the sheet open.
export function SectionSettingsSheet({ open, title, onClose, children }: SectionSettingsSheetProps) {
    const onOpenChange = useCallback((next: boolean) => !next && onClose(), [onClose]);

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange} modal={false} disablePointerDismissal>
            <Dialog.Portal>
                <Dialog.Popup className="smd-editor fixed inset-x-0 bottom-0 z-40 mx-auto flex max-h-[min(60svh,560px)] w-full max-w-xl flex-col rounded-t-[20px] border border-b-0 border-(--smd-editor-panel-line) bg-(--smd-editor-panel) text-[12.5px] text-(--smd-editor-text) shadow-[0_-18px_40px_rgba(0,0,0,0.45)] transition-transform duration-200 outline-none data-ending-style:translate-y-full data-starting-style:translate-y-full">
                    {/* Header */}
                    <div className="flex shrink-0 items-center justify-between gap-3 px-4 pt-3 pb-2">
                        <Dialog.Title className="truncate text-[14px] font-bold text-white">{title}</Dialog.Title>
                        <Dialog.Close render={<SectionSettingsDone />} />
                    </div>

                    {/* Settings */}
                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-1 pb-[max(1rem,env(safe-area-inset-bottom))]">
                        {children}
                    </div>
                </Dialog.Popup>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
