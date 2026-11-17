'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { Modal } from '@/components/ui/modal';

type EditorPanelSheetProps = {
    open: boolean;
    title: string;
    onClose: () => void;
    children: ReactNode;
};

// A side panel's content on phones and tablets, as a sheet from the bottom.
export function EditorPanelSheet({ open, title, onClose, children }: EditorPanelSheetProps) {
    const t = useTranslations('InvitationEditor');

    return (
        <Modal open={open} onClose={onClose} variant="sheet" ariaLabel={title} closeLabel={t('close')}>
            <Modal.Body className="flex flex-col gap-3 px-5 pt-5 pb-8 text-sm text-ink">
                {/* Title */}
                <h2 className="pr-10 text-base font-semibold">{title}</h2>

                {/* Content */}
                {children}
            </Modal.Body>
        </Modal>
    );
}
