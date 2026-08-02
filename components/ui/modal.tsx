'use client';

import { Dialog } from '@base-ui/react/dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

const sizeMap = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-4xl',
} as const;

type ModalSize = keyof typeof sizeMap;

interface ModalProps {
    open: boolean;
    onClose: () => void;
    size?: ModalSize;
    closeLabel?: string;
    className?: string;
    children: ReactNode;
}

export function Modal({ open, onClose, size = 'md', closeLabel = 'Close', className, children }: ModalProps) {
    return (
        <Dialog.Root
            open={open}
            onOpenChange={(nextOpen) => {
                if (!nextOpen) onClose();
            }}
        >
            <Dialog.Portal>
                <Dialog.Backdrop className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-sm" />
                <Dialog.Popup
                    className={cn(
                        'fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
                        'w-[calc(100vw-2rem)] max-h-[90dvh] overflow-hidden',
                        'bg-background rounded-2xl flex flex-col outline-none',
                        sizeMap[size],
                        className
                    )}
                >
                    <Dialog.Close
                        aria-label={closeLabel}
                        className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-muted text-ink-muted transition-colors"
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
