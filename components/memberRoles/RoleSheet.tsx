'use client';

import type { ReactNode } from 'react';

import { Modal } from '@/components/ui/modal';

// Bottom sheet frame for both role sheets. Back closes it (Modal's overlay history).
export function RoleSheet({
    title,
    closeLabel,
    onCloseAction,
    footer,
    children,
}: {
    title: string;
    closeLabel: string;
    onCloseAction: () => void;
    footer: ReactNode;
    children: ReactNode;
}) {
    return (
        <Modal open onClose={onCloseAction} variant="sheet" size="md" closeLabel={closeLabel} ariaLabel={title}>
            {/* Header */}
            <h2 className="px-5 pt-6 pb-2 pr-12 text-lg font-semibold text-ink">{title}</h2>

            {/* Body */}
            <Modal.Body className="px-5 pb-4">{children}</Modal.Body>

            {/* Footer */}
            <div className="flex items-center justify-between gap-2 border-t border-border/60 px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">{footer}</div>
        </Modal>
    );
}
