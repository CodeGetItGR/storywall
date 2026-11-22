import { DndContext } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import type { ComponentProps } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FeedEditBlock } from '@/components/feed/edit/FeedEditBlock';
import { SAMPLE_SECTIONS } from '@/lib/invitation/samples';
import type { InvitationSection } from '@/lib/invitation/sections';
import en from '@/messages/en.json';

// next/font only works when Next compiles the file.
vi.mock('@/components/saveMyDate/invitation/invitationFonts', () => ({ INVITATION_FONT_CLASSES: '' }));

const section = { ...(SAMPLE_SECTIONS.dressCode as InvitationSection), id: 'dress' };

function renderBlock(props: Partial<ComponentProps<typeof FeedEditBlock>> = {}) {
    const actions = { onToggleVisible: vi.fn(), onMove: vi.fn(), onDelete: vi.fn(), onOpenSettings: vi.fn() };
    render(
        <NextIntlClientProvider locale="en" messages={en}>
            <DndContext>
                <SortableContext items={['dress']}>
                    <FeedEditBlock
                        section={section}
                        name="Dress code"
                        controls={{ canHide: true, canDelete: true, movable: true, canMoveUp: true, canMoveDown: false }}
                        hasSettings
                        actions={actions}
                        {...props}
                    >
                        <div>
                            <p>Black tie</p>
                            <button type="button">Play</button>
                            <a href="#map">Map</a>
                            <p data-smd-text="field:title" role="button">
                                <span>Title</span>
                            </p>
                        </div>
                    </FeedEditBlock>
                </SortableContext>
            </DndContext>
        </NextIntlClientProvider>,
    );
    return actions;
}

afterEach(cleanup);

describe('FeedEditBlock taps', () => {
    it('opens its settings when the block is tapped', () => {
        const actions = renderBlock();
        fireEvent.click(screen.getByText('Black tie'));
        expect(actions.onOpenSettings).toHaveBeenCalledExactlyOnceWith('dress');
    });

    it("leaves the block's own buttons, links and inline text to do their own job", () => {
        const actions = renderBlock();
        fireEvent.click(screen.getByRole('button', { name: 'Play' }));
        fireEvent.click(screen.getByRole('link', { name: 'Map' }));
        fireEvent.click(screen.getByText('Title'));
        expect(actions.onOpenSettings).not.toHaveBeenCalled();
    });

    it('opens its settings once from the pencil', () => {
        const actions = renderBlock();
        fireEvent.click(screen.getByRole('button', { name: en.InvitationEditor.sectionSettings.open }));
        expect(actions.onOpenSettings).toHaveBeenCalledExactlyOnceWith('dress');
    });

    it("keeps its menu, drawn elsewhere on the page, from opening the block's settings", async () => {
        const user = userEvent.setup();
        const actions = renderBlock();
        await user.click(screen.getByRole('button', { name: en.InvitationEditor.sections.options }));
        await user.click(await screen.findByRole('menuitem', { name: en.InvitationEditor.sections.moveUp }));
        expect(actions.onMove).toHaveBeenCalledWith('dress', -1);
        expect(actions.onOpenSettings).not.toHaveBeenCalled();
    });

    it('ignores the tap on a block with nothing to set', () => {
        const actions = renderBlock({ hasSettings: false });
        fireEvent.click(screen.getByText('Black tie'));
        expect(actions.onOpenSettings).not.toHaveBeenCalled();
    });
});
