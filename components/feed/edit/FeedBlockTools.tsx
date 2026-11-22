'use client';

import { Eye, EyeOff, GripVertical } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { SectionMenu } from '@/components/saveMyDate/editor/sections/SectionMenu';
import { SectionSettingsButton } from '@/components/saveMyDate/editor/sections/SectionSettingsButton';
import { SectionToolButton } from '@/components/saveMyDate/editor/sections/SectionToolButton';
import { type FeedBlockToolActions, useFeedBlockHandlers } from '@/hooks/useFeedBlockHandlers';
import type { SectionDragHandle } from '@/hooks/useSectionSortable';
import type { FeedBlockControls } from '@/lib/feedEditing';
import type { InvitationSection } from '@/lib/invitation/sections';

type FeedBlockToolsProps = {
    section: InvitationSection;
    controls: FeedBlockControls;
    hasSettings: boolean;
    drag: SectionDragHandle;
    actions: FeedBlockToolActions;
};

// One block's tools: eye and pencil on the left, drag and menu on the right (middle blocks only).
// The cover's right corner holds Cancel and Save instead.
export function FeedBlockTools({ section, controls, hasSettings, drag, actions }: FeedBlockToolsProps) {
    const t = useTranslations('InvitationEditor.sections');
    const on = useFeedBlockHandlers(section.id, actions);
    const { activator, attributes, listeners } = drag;

    return (
        // transition-none keeps the tools instant, as in the old editor's toolbar (SectionToolbar).
        <div className="pointer-events-none absolute inset-x-2.5 top-3 z-40 flex items-start justify-between transition-none">
            {/* Visibility and settings */}
            <div className="pointer-events-auto flex gap-2">
                {controls.canHide && (
                    <SectionToolButton label={section.visible ? t('hide') : t('show')} isOff={!section.visible} onClick={on.toggleVisible}>
                        {section.visible ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
                    </SectionToolButton>
                )}
                {hasSettings && <SectionSettingsButton onClick={on.openSettings} />}
            </div>

            {/* Move and menu */}
            {controls.movable && (
                <div className="pointer-events-auto flex gap-2">
                    <SectionToolButton
                        ref={activator}
                        label={t('drag')}
                        className="cursor-grab touch-none active:cursor-grabbing"
                        {...attributes}
                        {...listeners}
                    >
                        <GripVertical aria-hidden="true" />
                    </SectionToolButton>
                    <SectionMenu
                        canMoveUp={controls.canMoveUp}
                        canMoveDown={controls.canMoveDown}
                        onMoveUp={on.moveUp}
                        onMoveDown={on.moveDown}
                        onDelete={controls.canDelete ? on.remove : undefined}
                    />
                </div>
            )}
        </div>
    );
}
