import { DndContext } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import type { ComponentProps } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FeedEditBlock } from '@/components/feed/edit/FeedEditBlock';
import { defaultFeedLayout } from '@/lib/feedLayout';
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

describe('FeedEditBlock name', () => {
    const pencil = () => screen.getByRole('button', { name: en.InvitationEditor.sectionSettings.open });

    it('shows the block name right after the eye and pencil, once for screen readers', () => {
        renderBlock();
        const label = screen.getByText('Dress code');
        expect(label).toHaveAttribute('aria-hidden', 'true');
        expect(label.previousElementSibling).toBe(pencil());
        expect(screen.getByRole('group', { name: 'Dress code' })).toBeTruthy();
    });

    it("shows the cover's name right after its pencil, in the same row as Cancel and Save", () => {
        const cover = defaultFeedLayout().sections.find((item) => item.type === 'feedCover') as InvitationSection;
        renderBlock({
            section: cover,
            name: 'Cover',
            controls: { canHide: false, canDelete: false, movable: false, canMoveUp: false, canMoveDown: false },
            corner: <button type="button">Cancel</button>,
        });
        const label = screen.getByText('Cover');
        expect(label.previousElementSibling).toBe(pencil());
        const row = label.closest('[data-feed-block-tools]') as HTMLElement;
        expect(within(row).getByRole('button', { name: 'Cancel' })).toBeTruthy();
    });

    // The name is no button: a tap on it falls through to the block, which opens the settings.
    it('lets a tap on the name through to the block', () => {
        renderBlock();
        expect(screen.getByText('Dress code')).toHaveClass('pointer-events-none');
        expect(screen.getByText('Dress code').parentElement).not.toHaveClass('pointer-events-auto');
    });
});

describe('FeedEditBlock while its settings are open', () => {
    it('keeps the accent outline and marks the block as the current one', () => {
        renderBlock({ active: true });
        const group = screen.getByRole('group', { name: 'Dress code' });
        expect(group).toHaveAttribute('aria-current', 'true');
        expect(group).toHaveClass('outline-2', 'outline-(--smd-editor-accent)');
    });

    it('shows the outline only on hover or focus otherwise', () => {
        renderBlock();
        const group = screen.getByRole('group', { name: 'Dress code' });
        expect(group).not.toHaveAttribute('aria-current');
        expect(group).not.toHaveClass('outline-2');
    });
});
