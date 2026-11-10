import { DndContext } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AddSectionSheet } from '@/components/saveMyDate/editor/sections/AddSectionSheet';
import { DeleteSectionDialog } from '@/components/saveMyDate/editor/sections/DeleteSectionDialog';
import { EditorSectionFrame } from '@/components/saveMyDate/editor/sections/EditorSectionFrame';
import type { SectionFrameActions } from '@/hooks/useSectionFrameHandlers';
import { SAMPLE_SECTIONS } from '@/lib/invitation/samples';
import type { SectionControls } from '@/lib/invitation/sectionActions';
import en from '@/messages/en.json';

function renderIn(node: ReactNode) {
    return render(
        <NextIntlClientProvider locale="en" messages={en}>
            {node}
        </NextIntlClientProvider>,
    );
}

function frameActions(): SectionFrameActions {
    return { activate: vi.fn(), toggleVisible: vi.fn(), move: vi.fn(), askDelete: vi.fn(), openAddList: vi.fn() };
}

function renderFrame(controls: Partial<SectionControls> & Pick<SectionControls, 'section'>, actions = frameActions()) {
    const full: SectionControls = { canMoveUp: true, canMoveDown: true, canAddBefore: false, canAddAfter: true, ...controls };
    renderIn(
        <DndContext>
            <SortableContext items={[full.section.id]}>
                <EditorSectionFrame controls={full} name="FAQ" isActive={false} actions={actions}>
                    <p>Section content</p>
                </EditorSectionFrame>
            </SortableContext>
        </DndContext>,
    );
    return { actions, frame: screen.getByRole('group', { name: 'FAQ' }) };
}

afterEach(cleanup);

describe('EditorSectionFrame', () => {
    it('hands every tool the section it belongs to', async () => {
        const { actions, frame } = renderFrame({ section: SAMPLE_SECTIONS.faq });
        const id = SAMPLE_SECTIONS.faq.id;
        expect(within(frame).getByText('Section content')).toBeInTheDocument();

        fireEvent.pointerDown(frame);
        fireEvent.click(within(frame).getByRole('button', { name: 'Hide section' }));
        fireEvent.click(within(frame).getByRole('button', { name: 'Add section' }));
        fireEvent.click(within(frame).getByRole('button', { name: 'Section options' }));
        fireEvent.click(await screen.findByRole('menuitem', { name: 'Move up' }));
        fireEvent.click(within(frame).getByRole('button', { name: 'Section options' }));
        fireEvent.click(await screen.findByRole('menuitem', { name: 'Delete' }));

        expect(actions.activate).toHaveBeenCalledWith(id);
        expect(actions.toggleVisible).toHaveBeenCalledWith(id);
        expect(actions.openAddList).toHaveBeenCalledWith({ id, place: 'after' });
        expect(actions.move).toHaveBeenCalledWith(id, -1);
        expect(actions.askDelete).toHaveBeenCalledWith(id);
    });

    it('marks a hidden section and offers to show it', () => {
        const { frame } = renderFrame({ section: { ...SAMPLE_SECTIONS.faq, visible: false } });
        expect(within(frame).getByText('Hidden')).toBeInTheDocument();
        expect(within(frame).getByRole('button', { name: 'Show section' })).toBeInTheDocument();
    });

    it('greys out the moves that are not possible', async () => {
        const { frame } = renderFrame({ section: SAMPLE_SECTIONS.faq, canMoveUp: false });
        fireEvent.click(within(frame).getByRole('button', { name: 'Section options' }));
        expect(await screen.findByRole('menuitem', { name: 'Move up' })).toHaveAttribute('aria-disabled', 'true');
        expect(screen.getByRole('menuitem', { name: 'Move down' })).not.toHaveAttribute('aria-disabled', 'true');
    });

    it('gives a locked section no tools', () => {
        const { frame } = renderFrame({ section: SAMPLE_SECTIONS.footer, canMoveUp: false, canMoveDown: false, canAddAfter: false });
        expect(within(frame).queryAllByRole('button')).toHaveLength(0);
        // Not a tab stop, but it can take focus after a delete.
        expect(frame).toHaveAttribute('tabindex', '-1');
    });

    it('offers a "+" above the footer when it is the only section left', () => {
        const actions = frameActions();
        const { frame } = renderFrame(
            { section: SAMPLE_SECTIONS.footer, canMoveUp: false, canMoveDown: false, canAddBefore: true, canAddAfter: false },
            actions,
        );
        fireEvent.click(within(frame).getByRole('button', { name: 'Add section' }));
        expect(actions.openAddList).toHaveBeenCalledWith({ id: SAMPLE_SECTIONS.footer.id, place: 'before' });
    });

    it('offers a "+" above and below the first section', () => {
        const actions = frameActions();
        const { frame } = renderFrame({ section: SAMPLE_SECTIONS.faq, canAddBefore: true }, actions);
        const [above, below] = within(frame).getAllByRole('button', { name: 'Add section' });
        fireEvent.click(above);
        fireEvent.click(below);
        expect(actions.openAddList).toHaveBeenNthCalledWith(1, { id: SAMPLE_SECTIONS.faq.id, place: 'before' });
        expect(actions.openAddList).toHaveBeenNthCalledWith(2, { id: SAMPLE_SECTIONS.faq.id, place: 'after' });
    });
});

describe('AddSectionSheet', () => {
    it('adds the section picked', () => {
        const onAdd = vi.fn();
        renderIn(<AddSectionSheet open types={['blank', 'photo']} onAdd={onAdd} onClose={vi.fn()} />);

        const sheet = screen.getByRole('dialog');
        expect(sheet).toHaveTextContent('Add section');
        fireEvent.click(within(sheet).getByRole('button', { name: 'Photo' }));
        expect(onAdd).toHaveBeenCalledWith('photo');
    });

    it('says when there is nothing left to add', () => {
        renderIn(<AddSectionSheet open types={[]} onAdd={vi.fn()} onClose={vi.fn()} />);
        expect(screen.getByRole('dialog')).toHaveTextContent('There are no more sections to add.');
    });
});

describe('DeleteSectionDialog', () => {
    it('names the section and deletes or cancels', () => {
        const onDelete = vi.fn();
        const onCancel = vi.fn();
        renderIn(<DeleteSectionDialog open sectionName="FAQ" onDelete={onDelete} onCancel={onCancel} />);

        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveTextContent('Delete this section?');
        expect(dialog).toHaveTextContent('The «FAQ» section will be removed from the invitation.');
        fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
        // The corner close button is called Cancel too.
        fireEvent.click(within(dialog).getAllByRole('button', { name: 'Cancel' })[0]);

        expect(onDelete).toHaveBeenCalledOnce();
        expect(onCancel).toHaveBeenCalled();
    });
});
