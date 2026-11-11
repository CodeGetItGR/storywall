'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { useCanvasHandles } from '@/components/saveMyDate/editor/handles/CanvasHandlesContext';
import { SectionHeightHandle } from '@/components/saveMyDate/editor/handles/SectionHeightHandle';
import { SectionAddButton } from '@/components/saveMyDate/editor/sections/SectionAddButton';
import { SectionToolbar } from '@/components/saveMyDate/editor/sections/SectionToolbar';
import { type SectionFrameActions, useSectionFrameHandlers } from '@/hooks/useSectionFrameHandlers';
import { useSectionSortable } from '@/hooks/useSectionSortable';
import type { SectionControls } from '@/lib/invitation/sectionActions';
import { cn } from '@/lib/utils';

type EditorSectionFrameProps = {
    controls: SectionControls;
    // The section's name as the add list calls it.
    name: string;
    isActive: boolean;
    actions: SectionFrameActions;
    children: ReactNode;
};

// One section on the editor's canvas with its tools. They show on hover, on
// focus and on the section last tapped, as in the old editor.
export function EditorSectionFrame({ controls, name, isActive, actions, children }: EditorSectionFrameProps) {
    const t = useTranslations('InvitationEditor.sections');
    const { section, canMoveUp, canMoveDown, canAddBefore, canAddAfter } = controls;
    const { setNodeRef, style, isDragging, drag } = useSectionSortable(section.id, name, section.locked);
    const { onActivate, onToggleVisible, onMoveUp, onMoveDown, onDelete, onAddBefore, onAddAfter } = useSectionFrameHandlers(section.id, actions);
    const showsTools = isActive || isDragging;
    const handles = useCanvasHandles();
    const hasHeightHandle = handles !== null && (section.type !== 'footer' || handles.mode === 'admin');

    return (
        <div
            ref={setNodeRef}
            style={style}
            data-editor-section={section.id}
            data-active={showsTools}
            role="group"
            aria-label={name}
            // A locked section isn't a tab stop, but takes focus after the section next to it is deleted.
            tabIndex={section.locked ? -1 : 0}
            onPointerDown={onActivate}
            onFocus={onActivate}
            className={cn(
                'group/section relative',
                !section.locked && 'outline-offset-[-2px] hover:outline-2 hover:outline-(--smd-editor-accent) data-[active=true]:outline-2 data-[active=true]:outline-(--smd-editor-accent)',
                isDragging && 'z-50 shadow-[0_10px_28px_rgba(0,0,0,0.35)]',
            )}
        >
            {/* Section */}
            <div className={cn('min-h-14', !section.visible && 'opacity-[0.48]')}>{children}</div>

            {/* Hidden from guests */}
            {!section.visible && (
                <span className="pointer-events-none absolute top-3 left-15 z-30 rounded-full border border-black/10 bg-white/95 px-2.5 py-1 text-[11px] text-[#555] sm:top-6">
                    {t('hidden')}
                </span>
            )}

            {/* Tools */}
            {!section.locked && (
                <SectionToolbar
                    visible={section.visible}
                    canMoveUp={canMoveUp}
                    canMoveDown={canMoveDown}
                    drag={drag}
                    onToggleVisible={onToggleVisible}
                    onMoveUp={onMoveUp}
                    onMoveDown={onMoveDown}
                    onDelete={onDelete}
                    className={showsTools ? 'visible' : 'invisible group-focus-within/section:visible group-hover/section:visible'}
                />
            )}

            {/* Add above */}
            {canAddBefore && <SectionAddButton placement="top" onClick={onAddBefore} />}

            {/* Add below */}
            {canAddAfter && <SectionAddButton placement="bottom" onClick={onAddAfter} />}

            {/* Height */}
            {hasHeightHandle && <SectionHeightHandle section={section} edit={handles.edit} />}
        </div>
    );
}
