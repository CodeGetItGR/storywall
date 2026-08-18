'use client';

import { Dialog } from '@base-ui/react/dialog';
import { X } from 'lucide-react';
import { type ReactNode, useCallback } from 'react';

import { cn } from '@/lib/utils';

interface AdminDrawerProps {
    open: boolean;
    onClose: () => void;
    title: ReactNode;
    subtitle?: ReactNode;
    closeLabel: string;
    footer?: ReactNode;
    children: ReactNode;
}

// A right slide-over scoped to one record, per AGENTS.md — editing and
// browsing stay visually distinct modes instead of a full-screen modal.
export function AdminDrawer({ open, onClose, title, subtitle, closeLabel, footer, children }: AdminDrawerProps) {
    const onOpenChange = useCallback(
        (nextOpen: boolean) => {
            if (!nextOpen) onClose();
        },
        [onClose]
    );

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Backdrop forceRender className="fixed inset-0 z-50 bg-[#0a0b0f]/38" />
                <Dialog.Popup
                    className={cn(
                        'fixed inset-y-0 right-0 z-50 flex h-dvh w-[min(440px,100vw)] flex-col overflow-hidden',
                        'border-l border-border bg-card text-ink shadow-[0_24px_60px_-20px_rgba(18,20,28,0.45)] outline-none',
                        'transition-transform duration-200 ease-out motion-safe:data-starting-style:translate-x-full motion-safe:data-ending-style:translate-x-0'
                    )}
                >
                    <div className="flex items-start justify-between gap-3 border-b border-border px-5 pb-3.5 pt-4.5">
                        <div className="min-w-0">
                            <Dialog.Title className="truncate text-[16.5px] font-extrabold tracking-tight text-ink">{title}</Dialog.Title>
                            {subtitle && <p className="mt-0.5 truncate text-xs text-ink-faint">{subtitle}</p>}
                        </div>
                        <Dialog.Close
                            aria-label={closeLabel}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-canvas text-ink-muted transition-colors hover:text-ink"
                        >
                            <X className="h-3.5 w-3.5" />
                        </Dialog.Close>
                    </div>

                    <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-4.5">{children}</div>

                    {footer && <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3.5">{footer}</div>}
                </Dialog.Popup>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
