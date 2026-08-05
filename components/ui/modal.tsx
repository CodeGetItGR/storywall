'use client';

import { Dialog } from '@base-ui/react/dialog';
import { X } from 'lucide-react';
import { type ReactNode, useCallback } from 'react';

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
    variant?: 'center' | 'sheet';
    closeLabel?: string;
    className?: string;
    children: ReactNode;
    closeButtonPosition?: 'left' | 'right';
}

export function Modal({
    open,
    onClose,
    size = 'md',
    variant = 'center',
    closeLabel = 'Close',
    className,
    children,
    closeButtonPosition = 'right',
}: ModalProps) {
    const isFull = size === 'full';
    const isSheet = variant === 'sheet';

    const onOpenChange = useCallback((nextOpen: boolean) => {
        if (!nextOpen) onClose();
    }, [onClose]);

    return (
        <Dialog.Root
            open={open}
            onOpenChange={onOpenChange}
        >
            <Dialog.Portal>
                <Dialog.Backdrop className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-sm" />
                <Dialog.Popup
                    className={cn(
                        'fixed z-50 flex flex-col bg-background outline-none',
                        isFull
                            ? 'inset-0 w-screen h-dvh max-h-dvh rounded-none'
                            : isSheet
                              ? cn(
                                    'inset-x-0 bottom-0 mx-auto w-[calc(100vw-1rem)] max-h-[88dvh] overflow-hidden rounded-t-[1.75rem] rounded-b-none sm:max-w-2xl',
                                    'sm:bottom-6 sm:rounded-b-3xl sm:rounded-t-3xl sm:shadow-[0_24px_60px_rgba(36,31,26,0.22)]'
                                )
                            : cn(
                                  'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
                                  'w-[calc(100vw-2rem)] max-h-[90dvh] overflow-hidden rounded-2xl',
                                  sizeMap[size]
                              ),
                        className
                    )}
                >
                    <Dialog.Close
                        aria-label={closeLabel}
                        className={cn(
                            `absolute top-3 ${closeButtonPosition}-3 z-20 flex h-8 w-8 items-center justify-center rounded-full transition-colors`,
                            isFull ? 'bg-black/40 hover:bg-black/60 text-white' : 'hover:bg-surface-muted text-ink-muted',
                            )}
                    >
                        <X className="w-5 h-5" />
                    </Dialog.Close>
                    {children}
                </Dialog.Popup>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

function ModalBody({ className, children }: { className?: string; children: ReactNode }) {
    return <div className={cn('flex-1 min-h-0 overflow-y-auto', className)}>{children}</div>;
}

Modal.Body = ModalBody;
