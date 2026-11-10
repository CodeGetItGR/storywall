'use client';

import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { Modal } from '@/components/ui/modal';
import type { NewSectionType } from '@/lib/invitation/newSection';

type AddSectionSheetProps = {
    open: boolean;
    types: NewSectionType[];
    onAdd: (type: NewSectionType) => void;
    onClose: () => void;
};

// The sections the host may add at the "+" they pressed.
export function AddSectionSheet({ open, types, onAdd, onClose }: AddSectionSheetProps) {
    const t = useTranslations('InvitationEditor');

    return (
        <Modal open={open} onClose={onClose} variant="sheet" ariaLabel={t('sections.add')} closeLabel={t('close')}>
            <Modal.Body className="flex flex-col gap-4 px-5 pt-5 pb-8 text-sm text-ink">
                {/* Title */}
                <h2 className="pr-10 text-base font-semibold">{t('sections.add')}</h2>

                {/* Sections */}
                {types.length > 0 ? (
                    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {types.map((type) => (
                            <li key={type}>
                                <AddSectionOption type={type} name={t(`sectionNames.${type}`)} onAdd={onAdd} />
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-ink-muted">{t('sections.nothingToAdd')}</p>
                )}
            </Modal.Body>
        </Modal>
    );
}

type AddSectionOptionProps = {
    type: NewSectionType;
    name: string;
    onAdd: (type: NewSectionType) => void;
};

// One section in the list.
function AddSectionOption({ type, name, onAdd }: AddSectionOptionProps) {
    const add = useCallback(() => onAdd(type), [onAdd, type]);

    return (
        <button
            type="button"
            onClick={add}
            className="flex min-h-12 w-full items-center rounded-xl bg-surface-muted px-4 py-2 text-left font-medium transition-colors hover:bg-border focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        >
            {name}
        </button>
    );
}
