'use client';

import { Popover } from '@base-ui/react/popover';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { keepTextFocus, TEXT_TOOL_CLASS } from '@/components/saveMyDate/editor/text/TextToolbarButton';
import type { TextRole } from '@/lib/invitation/textEditing';

type TextAddMenuProps = {
    disabled: boolean;
    onAdd: (role: TextRole) => void;
};

const SAMPLE_SIZE: Record<TextRole, string> = { title: 'text-[22px]', subtitle: 'text-[18px]', paragraph: 'text-[15px]' };

// Adds a title, subtitle or paragraph to the section of the text being edited.
export function TextAddMenu({ disabled, onAdd }: TextAddMenuProps) {
    const t = useTranslations('InvitationEditor');

    return (
        <Popover.Root>
            {/* Trigger */}
            <Popover.Trigger aria-label={t('addText')} title={t('addText')} disabled={disabled} onMouseDown={keepTextFocus} className={TEXT_TOOL_CLASS}>
                <Plus aria-hidden="true" />
            </Popover.Trigger>

            <Popover.Portal>
                <Popover.Positioner side="top" sideOffset={8} collisionPadding={12} className="z-40">
                    <Popover.Popup className="smd-editor w-52 rounded-[14px] border border-(--smd-editor-panel-line) bg-(--smd-editor-panel) p-1.5 text-(--smd-editor-text) shadow-[0_18px_40px_rgba(0,0,0,0.45)] outline-none">
                        {/* Kinds of text */}
                        <AddChoice role="title" label={t('addTitle')} onAdd={onAdd} />
                        <AddChoice role="subtitle" label={t('addSubtitle')} onAdd={onAdd} />
                        <AddChoice role="paragraph" label={t('addParagraph')} onAdd={onAdd} />
                    </Popover.Popup>
                </Popover.Positioner>
            </Popover.Portal>
        </Popover.Root>
    );
}

type AddChoiceProps = { role: TextRole; label: string; onAdd: (role: TextRole) => void };

function AddChoice({ role, label, onAdd }: AddChoiceProps) {
    const add = useCallback(() => onAdd(role), [onAdd, role]);

    return (
        <Popover.Close
            onClick={add}
            className={`flex min-h-11 w-full items-center rounded-[10px] px-3 text-left hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${SAMPLE_SIZE[role]}`}
        >
            {label}
        </Popover.Close>
    );
}
