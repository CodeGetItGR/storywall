'use client';

import { Dialog } from '@base-ui/react/dialog';
import { X } from 'lucide-react';
import { forwardRef, type ReactNode, useCallback } from 'react';

import { useOverlayHistory } from '@/hooks/useOverlayHistory';
import { cn } from '@/lib/utils';

const sizeMap = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-4xl',
} as const;

type ModalSize = keyof typeof sizeMap | 'full';

interface ModalProps {
    open: boolean;
    onClose: () => void;
    size?: ModalSize;
    variant?: 'center' | 'sheet' | 'drawer';
    closeLabel?: string;
    ariaLabel?: string;
    className?: string;
    children: ReactNode;
    closeButtonPosition?: 'left' | 'right';
    dismissOnBack?: boolean;
    showCloseButton?: boolean;
}

export function Modal({
    open,
    onClose,
    size = 'md',
    variant = 'center',
    closeLabel = 'Close',
    ariaLabel,
    className,
    children,
    closeButtonPosition = 'right',
    dismissOnBack = true,
    showCloseButton = true,
}: ModalProps) {
    const isFull = size === 'full';
    const isSheet = variant === 'sheet';
    const isDrawer = variant === 'drawer';
    const { requestClose } = useOverlayHistory(open, onClose, dismissOnBack);

    const onOpenChange = useCallback(
        (nextOpen: boolean) => {
            if (!nextOpen) requestClose();
        },
        [requestClose],
    );

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                {/* Backdrop */}
                {/* Base UI skips the backdrop of a nested dialog, which left confirmations
                    floating over a fully lit editor and read as two competing windows.
                    Forcing it keeps the dialog on top the only lit layer.
                    forceRender means this element is also rendered while the dialog is
                    closed, so the closed state must be explicitly inert: a full-screen
                    fixed layer that outlives its dialog swallows every click on the page
                    and looks identical to the app having hung. */}
                <Dialog.Backdrop
                    forceRender
                    className="motion-overlay fixed inset-0 z-50 bg-ink/60 opacity-100 backdrop-blur-sm data-closed:pointer-events-none data-closed:opacity-0"
                />
                {/* Surface */}
                <Dialog.Popup
                    aria-label={ariaLabel}
                    className={cn(
                        'motion-surface fixed z-50 flex flex-col bg-background outline-none',
                        isFull
                            ? 'inset-x-0 top-(--visual-viewport-offset-top) h-(--visual-viewport-height) max-h-(--visual-viewport-height) w-screen rounded-none data-ending-style:opacity-0 data-starting-style:opacity-0'
                            : isDrawer
                              ? cn(
                                    'top-(--visual-viewport-offset-top) left-0 h-(--visual-viewport-height) w-[min(88vw,22.5rem)] overflow-hidden rounded-r-[1.75rem] shadow-[18px_0_50px_rgba(36,31,26,0.18)]',
                                    'data-ending-style:-translate-x-full data-ending-style:opacity-0 data-starting-style:-translate-x-full data-starting-style:opacity-0',
                                )
                              : isSheet
                                ? cn(
                                      'inset-x-0 bottom-(--visual-viewport-bottom-inset) mx-auto max-h-[calc(var(--visual-viewport-height)-0.5rem)] w-[calc(100vw-1rem)] overflow-hidden rounded-t-[1.75rem] rounded-b-none shadow-[0_-18px_50px_rgba(36,31,26,0.18)]',
                                      'data-ending-style:translate-y-full data-ending-style:opacity-0 data-starting-style:translate-y-full data-starting-style:opacity-0',
                                      'sm:bottom-[calc(var(--visual-viewport-bottom-inset)+1.5rem)] sm:max-h-[calc(var(--visual-viewport-height)-3rem)] sm:max-w-2xl sm:rounded-t-3xl sm:rounded-b-3xl sm:shadow-[0_24px_60px_rgba(36,31,26,0.22)]',
                                  )
                                : cn(
                                      'top-(--visual-viewport-center-y) left-1/2 -translate-x-1/2 -translate-y-1/2',
                                      'max-h-[calc(var(--visual-viewport-height)-2rem)] w-[calc(100vw-2rem)] overflow-hidden rounded-2xl',
                                      'scale-100 data-ending-style:scale-[0.96] data-ending-style:opacity-0 data-starting-style:scale-[0.96] data-starting-style:opacity-0',
                                      sizeMap[size],
                                  ),
                        className,
                    )}
                >
                    {/* Close */}
                    {showCloseButton && (
                        <Dialog.Close
                            aria-label={closeLabel}
                            className={cn(
                                `absolute top-3 ${closeButtonPosition}-3 z-20 flex h-8 w-8 items-center justify-center rounded-full transition-colors`,
                                isFull ? 'bg-black/40 text-white hover:bg-black/60' : 'text-ink-muted hover:bg-surface-muted',
                            )}
                        >
                            <X className="h-5 w-5" />
                        </Dialog.Close>
                    )}
                    {children}
                </Dialog.Popup>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

// forwardRef so a newly-posted comment can be scrolled into view within this
// scroll container (see usePostCommentThread's lastPostedCommentId).
const ModalBody = forwardRef<HTMLDivElement, { className?: string; children: ReactNode }>(function ModalBody({ className, children }, ref) {
    return (
        <div ref={ref} className={cn('min-h-0 flex-1 overflow-y-auto', className)}>
            {children}
        </div>
    );
});

Modal.Body = ModalBody;
