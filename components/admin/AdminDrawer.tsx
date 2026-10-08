'use client';

import { Dialog } from '@base-ui/react/dialog';
import { X } from 'lucide-react';
import { createContext, type ReactNode, useCallback, useContext, useState } from 'react';

import { useOverlayHistory } from '@/hooks/useOverlayHistory';
import { cn } from '@/lib/utils';

interface AdminDrawerProps {
    open: boolean;
    onClose: () => void;
    title: ReactNode;
    subtitle?: ReactNode;
    closeLabel: string;
    footer?: ReactNode;
    children: ReactNode;
    /** `modal` centers a large surface on desktop (full screen on phones) for editors too dense for a side panel. */
    size?: 'default' | 'wide' | 'modal';
    /**
     * While true (e.g. a save in flight), ×, Esc and the overlay don't close the drawer, and the × is
     * hidden. Checked before requestClose, which would otherwise drop the drawer's history entry and
     * leave it open but unregistered. Back still closes it: owners must cope with an unmount mid-save.
     */
    closeDisabled?: boolean;
}

const DrawerFooterSlotContext = createContext<HTMLDivElement | null>(null);

// Exposes the drawer's real footer container (outside the scrollable body) so
// content deep inside `children` — e.g. a form component that owns its own
// save-bar state — can portal its footer there instead of faking one with
// `position: sticky` inside the scrolling area, which floats mid-list on short
// content and overlays the tail of a long one instead of sitting below it.
export function useAdminDrawerFooterSlot() {
    return useContext(DrawerFooterSlotContext);
}

// A right slide-over scoped to one record, per AGENTS.md — editing and
// browsing stay visually distinct modes. `size="modal"` is the exception for
// editors whose sections need room side by side (e.g. plans).
export function AdminDrawer({
    open,
    onClose,
    title,
    subtitle,
    closeLabel,
    footer,
    children,
    size = 'default',
    closeDisabled = false,
}: AdminDrawerProps) {
    const [footerSlot, setFooterSlot] = useState<HTMLDivElement | null>(null);
    // Back closes the drawer instead of leaving the section it was opened from.
    const { requestClose } = useOverlayHistory(open, onClose);
    const onOpenChange = useCallback(
        (nextOpen: boolean) => {
            if (!nextOpen && closeDisabled) return;
            if (!nextOpen) requestClose();
        },
        [closeDisabled, requestClose],
    );

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                {/* Backdrop */}
                <Dialog.Backdrop forceRender className="motion-overlay fixed inset-0 z-50 bg-[#0a0b0f]/38 opacity-100" />
                {/* Surface */}
                <Dialog.Popup
                    className={cn(
                        'motion-surface fixed top-(--visual-viewport-offset-top) right-0 z-50 flex h-(--visual-viewport-height) flex-col overflow-hidden',
                        'bg-card text-ink shadow-[0_24px_60px_-20px_rgba(18,20,28,0.45)] outline-none',
                        size === 'modal'
                            ? [
                                  'w-full md:inset-0 md:m-auto md:h-[min(920px,calc(100dvh-48px))] md:w-[min(1120px,calc(100vw-48px))] md:rounded-xl md:border md:border-border',
                                  'data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0',
                              ]
                            : [
                                  size === 'wide' ? 'w-[min(680px,100vw)]' : 'w-[min(440px,100vw)]',
                                  'border-l border-border',
                                  'data-ending-style:translate-x-full data-ending-style:opacity-0 data-starting-style:translate-x-full data-starting-style:opacity-0',
                              ],
                    )}
                >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 border-b border-border px-5 pt-4.5 pb-3.5">
                        <div className="min-w-0">
                            <Dialog.Title className="truncate text-[16.5px] font-extrabold tracking-tight text-ink">{title}</Dialog.Title>
                            {subtitle && <p className="mt-0.5 truncate text-xs text-ink-faint">{subtitle}</p>}
                        </div>
                        {!closeDisabled && (
                            <Dialog.Close
                                aria-label={closeLabel}
                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-canvas text-ink-muted transition-colors hover:text-ink"
                            >
                                <X className="h-3.5 w-3.5" />
                            </Dialog.Close>
                        )}
                    </div>

                    {/* Content */}
                    <DrawerFooterSlotContext.Provider value={footerSlot}>
                        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-4.5">{children}</div>
                    </DrawerFooterSlotContext.Provider>

                    {/* Footer */}
                    <div ref={setFooterSlot} className="flex items-center justify-between gap-3 border-t border-border px-5 py-3.5 empty:hidden">
                        {footer}
                    </div>
                </Dialog.Popup>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
