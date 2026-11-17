import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { useStore } from 'zustand';

import { storyDraft } from '@/.storybook/editor';
import { SectionHeightHandle } from '@/components/saveMyDate/editor/handles/SectionHeightHandle';
import { InvitationRenderer } from '@/components/saveMyDate/invitation/InvitationRenderer';
import type { CanvasTools } from '@/lib/invitation/canvasTools';
import { createInvitationEditorStore } from '@/lib/invitation/editorStore';

const draft = storyDraft();
const SAVED_HEIGHTS: CanvasTools = { savedHeights: true };

type HeightFrameProps = { sectionId: string };

// One section of the sample invitation in a frame, with its height bar. Dragging it works.
function HeightFrame({ sectionId }: HeightFrameProps) {
    const [store] = useState(() => createInvitationEditorStore(draft.document));
    const document = useStore(store, (state) => state.document);
    const section = document.sections.find((item) => item.id === sectionId)!;
    return (
        <div className="smd-editor pb-8">
            <div data-editor-section={sectionId} className="relative">
                <InvitationRenderer document={{ ...document, sections: [section] }} theme={draft.theme} media={draft.media} canvasTools={SAVED_HEIGHTS} />
                <SectionHeightHandle section={section} edit={store.getState().edit} />
            </div>
        </div>
    );
}

const meta = {
    title: 'SaveMyDate/Editor/Handles/SectionHeightHandle',
    component: HeightFrame,
    parameters: { layout: 'fullscreen' },
    args: { sectionId: 's-faq' },
} satisfies Meta<typeof HeightFrame>;

export default meta;
type Story = StoryObj<typeof meta>;

// On the bottom edge, on the right.
export const Default: Story = {};

// The footer's bar sits inside it, on the left (admins).
export const Footer: Story = {
    args: { sectionId: 's-footer' },
};
