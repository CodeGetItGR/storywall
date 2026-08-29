'use client';

import { type ReactNode } from 'react';

import { Modal } from '@/components/ui/modal';
import { cn } from '@/lib/utils';

type ConfirmActionModalProps = {
    open: boolean;
    title: string;
    body: ReactNode;
    confirmLabel: string;
    cancelLabel: string;
    onCloseAction: () => void;
    onConfirmAction: () => void | Promise<void>;
    isConfirming?: boolean;
    tone?: 'danger' | 'default';
    icon?: ReactNode;
    size?: 'sm' | 'md';
    showCancelAction?: boolean;
    showCloseButton?: boolean;
};

export function ConfirmActionModal({
    open,
    title,
    body,
    confirmLabel,
    cancelLabel,
    onCloseAction,
    onConfirmAction,
    isConfirming = false,
    tone = 'danger',
    icon,
    size = 'sm',
    showCancelAction = true,
    showCloseButton = true,
}: ConfirmActionModalProps) {
    return (
        <Modal open={open} onClose={onCloseAction} size={size} closeLabel={cancelLabel} showCloseButton={showCloseButton}>
            <Modal.Body className={cn('px-4 pb-4 sm:px-5', showCloseButton ? 'pt-12' : 'pt-5')}>
                <div className="flex flex-col gap-5">
                    {/* Confirmation content */}
                    <div className="flex items-start gap-3 pr-8">
                        {icon ? (
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">{icon}</div>
                        ) : (
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
                                <span className="text-lg font-semibold">!</span>
                            </div>
                        )}

                        <div className="min-w-0">
                            <h2 className="text-base font-semibold text-ink">{title}</h2>
                            <div className="mt-1 text-sm leading-relaxed text-ink-muted">{body}</div>
                        </div>
                    </div>

                    {/* Confirmation actions */}
                    <div className="flex flex-wrap items-center justify-end gap-2">
                        {showCancelAction && (
                            <button
                                type="button"
                                onClick={onCloseAction}
                                className="rounded-full bg-surface-muted px-4 py-2 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
                                disabled={isConfirming}
                            >
                                {cancelLabel}
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={onConfirmAction}
                            disabled={isConfirming}
                            className={
                                tone === 'danger'
                                    ? 'rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60'
                                    : 'rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-60'
                            }
                        >
                            {confirmLabel}
                        </button>
                    </div>
                </div>
            </Modal.Body>
        </Modal>
    );
}
