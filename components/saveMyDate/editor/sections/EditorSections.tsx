'use client';

import { closestCenter, DndContext } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useTranslations } from 'next-intl';
import { type ReactNode, useMemo } from 'react';

import { AddSectionSheet } from '@/components/saveMyDate/editor/sections/AddSectionSheet';
import { DeleteSectionDialog } from '@/components/saveMyDate/editor/sections/DeleteSectionDialog';
import { EditorSectionFrame } from '@/components/saveMyDate/editor/sections/EditorSectionFrame';
import type { SectionActions } from '@/hooks/useSectionActions';
import { useSectionDrag } from '@/hooks/useSectionDrag';
import type { SectionFrameActions } from '@/hooks/useSectionFrameHandlers';
import type { InvitationSection } from '@/lib/invitation/sections';

const MODIFIERS = [restrictToVerticalAxis];

type WrapSection = (section: InvitationSection, index: number, content: ReactNode) => ReactNode;

type EditorSectionsProps = {
    actions: SectionActions;
    // The invitation, drawn with each section wrapped in its tools.
    children: (wrapSection: WrapSection) => ReactNode;
};

// Adding, moving, hiding and deleting the invitation's sections on the canvas.
export function EditorSections({ actions, children }: EditorSectionsProps) {
    const t = useTranslations('InvitationEditor.sectionNames');
    const { controls, activeId, setActiveId, move, reorder, toggleVisible, addList, deleteConfirm } = actions;
    const drag = useSectionDrag(controls.length, reorder);
    const frameActions = useMemo<SectionFrameActions>(
        () => ({ activate: setActiveId, toggleVisible, move, askDelete: deleteConfirm.ask, openAddList: addList.open }),
        [setActiveId, toggleVisible, move, deleteConfirm.ask, addList.open],
    );

    const wrapSection: WrapSection = (section, index, content) => (
        <EditorSectionFrame
            controls={controls[index]}
            name={t(section.type)}
            isActive={activeId === section.id}
            actions={frameActions}
        >
            {content}
        </EditorSectionFrame>
    );

    return (
        <>
            {/* Sections */}
            <DndContext
                sensors={drag.sensors}
                collisionDetection={closestCenter}
                modifiers={MODIFIERS}
                accessibility={drag.accessibility}
                onDragEnd={drag.onDragEnd}
            >
                <SortableContext items={controls.map(({ section }) => section.id)} strategy={verticalListSortingStrategy}>
                    {children(wrapSection)}
                </SortableContext>
            </DndContext>

            {/* Add list */}
            <AddSectionSheet open={addList.isOpen} types={addList.types} onAdd={addList.add} onClose={addList.close} />

            {/* Delete confirmation */}
            <DeleteSectionDialog
                open={deleteConfirm.isOpen}
                sectionName={deleteConfirm.sectionType ? t(deleteConfirm.sectionType) : ''}
                onDelete={deleteConfirm.confirm}
                onCancel={deleteConfirm.cancel}
            />
        </>
    );
}
