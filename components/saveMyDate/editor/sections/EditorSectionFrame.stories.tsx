import { DndContext } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import type { Decorator, Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { copyFor } from '@/.storybook/copy';
import { storyDraft } from '@/.storybook/editor';
import { waitForOpen } from '@/.storybook/waitForOpen';
import { EditorSectionFrame } from '@/components/saveMyDate/editor/sections/EditorSectionFrame';
import { InvitationRenderer } from '@/components/saveMyDate/invitation/InvitationRenderer';
import type { InvitationSection } from '@/lib/invitation/sections';

const draft = storyDraft();
const sectionOf = (type: InvitationSection['type']) => draft.document.sections.find((section) => section.type === type)!;

// One section of the sample invitation, drawn by the guest renderer.
function sectionContent(section: InvitationSection) {
    return (
        <InvitationRenderer document={{ ...draft.document, sections: [section] }} theme={draft.theme} media={draft.media} showHidden />
    );
}

// The frame needs the editor's drag list around it, and room below for its "+".
const withDragList: Decorator = (Story, { args }) => (
    <div className="smd-editor pb-8">
        <DndContext>
            <SortableContext items={[(args as { controls: { section: InvitationSection } }).controls.section.id]}>
                <Story />
            </SortableContext>
        </DndContext>
    </div>
);

const faq = sectionOf('faq');
const hiddenFaq = { ...faq, visible: false };
const footer = sectionOf('footer');

const meta = {
    title: 'SaveMyDate/Editor/Sections/EditorSectionFrame',
    component: EditorSectionFrame,
    decorators: [withDragList],
    parameters: { layout: 'fullscreen' },
    args: {
        controls: { section: faq, canMoveUp: true, canMoveDown: true, canAddBefore: false, canAddAfter: true },
        name: 'FAQ',
        isActive: false,
        actions: { activate: fn(), toggleVisible: fn(), move: fn(), askDelete: fn(), openAddList: fn(), openSettings: fn() },
        children: sectionContent(faq),
    },
} satisfies Meta<typeof EditorSectionFrame>;

export default meta;
type Story = StoryObj<typeof meta>;

// At rest only the "+" shows; the tools come up on hover or a tap.
export const Default: Story = {};

// The section last tapped keeps its tools and outline.
export const Active: Story = {
    args: { isActive: true },
};

// Hidden from guests: faded, with a badge and a red eye.
export const Hidden: Story = {
    args: {
        isActive: true,
        controls: { section: hiddenFaq, canMoveUp: true, canMoveDown: true, canAddBefore: false, canAddAfter: true },
        children: sectionContent(hiddenFaq),
    },
};

// The footer stays where it is: no tools and no "+".
export const Locked: Story = {
    args: {
        controls: { section: footer, canMoveUp: false, canMoveDown: false, canAddBefore: false, canAddAfter: false },
        name: 'Footer',
        children: sectionContent(footer),
    },
};

// The first section also has a "+" above it.
export const First: Story = {
    args: { controls: { section: faq, canMoveUp: false, canMoveDown: true, canAddBefore: true, canAddAfter: true } },
};

// Once every other section is deleted, the footer keeps a "+" above it.
export const OnlyFooter: Story = {
    args: {
        controls: { section: footer, canMoveUp: false, canMoveDown: false, canAddBefore: true, canAddAfter: false },
        name: 'Footer',
        children: sectionContent(footer),
    },
    play: async ({ args, canvasElement, globals }) => {
        await userEvent.click(within(canvasElement).getByRole('button', { name: copyFor(globals).InvitationEditor.sections.add }));
        await expect(args.actions.openAddList).toHaveBeenCalledWith({ id: footer.id, place: 'before' });
    },
};

// The first section can't move up.
export const Menu: Story = {
    args: { isActive: true, controls: { section: faq, canMoveUp: false, canMoveDown: true, canAddBefore: false, canAddAfter: true } },
    play: async ({ canvasElement, globals }) => {
        const copy = copyFor(globals).InvitationEditor.sections;
        await userEvent.click(within(canvasElement).getByRole('button', { name: copy.options }));
        const menu = await waitForOpen('menu');
        await expect(within(menu).getByRole('menuitem', { name: copy.moveUp })).toHaveAttribute('aria-disabled', 'true');
    },
};

// Each tool reports which section it belongs to.
export const Tools: Story = {
    tags: ['visual-skip'],
    args: { isActive: true },
    play: async ({ args, canvasElement, globals }) => {
        const copy = copyFor(globals).InvitationEditor.sections;
        const frame = within(canvasElement);
        await userEvent.click(frame.getByRole('button', { name: copy.hide }));
        await expect(args.actions.toggleVisible).toHaveBeenCalledWith(faq.id);
        await userEvent.click(frame.getByRole('button', { name: copy.add }));
        await expect(args.actions.openAddList).toHaveBeenCalledWith({ id: faq.id, place: 'after' });
        await userEvent.click(frame.getByRole('button', { name: copy.options }));
        await userEvent.click(within(await waitForOpen('menu')).getByRole('menuitem', { name: copy.delete }));
        await expect(args.actions.askDelete).toHaveBeenCalledWith(faq.id);
    },
};
