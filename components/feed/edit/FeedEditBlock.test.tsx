import { DndContext } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
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
    const actions = { onToggleVisible: vi.fn(), onDelete: vi.fn(), onOpenSettings: vi.fn() };
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

    it('ignores the tap on a block with nothing to set', () => {
        const actions = renderBlock({ hasSettings: false });
        fireEvent.click(screen.getByText('Black tie'));
        expect(actions.onOpenSettings).not.toHaveBeenCalled();
    });
});

describe('FeedEditBlock name', () => {
    it('shows the block name right after the eye, once for screen readers', () => {
        renderBlock();
        const label = screen.getByText('Dress code');
        expect(label).toHaveAttribute('aria-hidden', 'true');
        expect(label.previousElementSibling).toBe(screen.getByRole('button', { name: en.InvitationEditor.sections.hide }));
        expect(screen.getByRole('group', { name: 'Dress code' })).toBeTruthy();
    });

    // Theme, Cancel and Save moved to a row under the cover (FeedEditRow), so the cover keeps its name on phones too.
    it("shows the cover's name first, on every screen", () => {
        const cover = defaultFeedLayout().sections.find((item) => item.type === 'feedCover') as InvitationSection;
        renderBlock({
            section: cover,
            name: 'Cover',
            controls: { canHide: false, canDelete: false, movable: false, canMoveUp: false, canMoveDown: false },
        });
        const label = screen.getByText('Cover');
        expect(label.previousElementSibling).toBeNull();
        expect(label).not.toHaveClass('max-sm:hidden');
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

describe('FeedEditBlock layout', () => {
    const [, details] = defaultFeedLayout().sections;

    it('adds no strip above a feed block: the tools float over its top', () => {
        renderBlock({ section: details, name: 'Details' });
        const block = screen.getByText('Black tie').parentElement?.parentElement as HTMLElement;
        expect(block.className).not.toContain('pt-14');
    });

    it('shows Hidden in the tools row, next to the name', () => {
        renderBlock({ section: { ...section, visible: false } });
        const tools = document.querySelector('[data-feed-block-tools]') as HTMLElement;
        expect(within(tools).getByText(en.InvitationEditor.sections.hidden)).toBeTruthy();
    });
});

describe('FeedEditBlock members only', () => {
    it('marks a members-only block in its tools', () => {
        renderBlock({ section: { ...section, membersOnly: true } });
        const tools = document.querySelector('[data-feed-block-tools]') as HTMLElement;
        expect(within(tools).getByText(en.FeedLayout.membersOnly)).toBeTruthy();
    });
});

describe('FeedEditBlock tools (2026-11-23)', () => {
    it('puts the eye and name left, and ✕, drag and settings stacked right, with no menu', () => {
        renderBlock({ controls: { canHide: true, canDelete: true, movable: true, canMoveUp: true, canMoveDown: true }, hasSettings: true });
        const tools = document.querySelector('[data-feed-block-tools]') as HTMLElement;
        const right = tools.querySelector('[data-feed-block-tools-right]') as HTMLElement;
        expect(within(right).getAllByRole('button').map((button) => button.getAttribute('aria-label'))).toEqual([
            en.InvitationEditor.sections.delete,
            en.InvitationEditor.sections.drag,
            en.InvitationEditor.sectionSettings.open,
        ]);
        expect(within(tools).queryByRole('button', { name: en.InvitationEditor.sections.options })).toBeNull();
        expect(within(tools).getByRole('button', { name: en.InvitationEditor.sections.hide })).toBeTruthy();
    });

    it('asks before deleting', () => {
        const actions = renderBlock({ controls: { canHide: true, canDelete: true, movable: true, canMoveUp: false, canMoveDown: false } });
        fireEvent.click(screen.getByRole('button', { name: en.InvitationEditor.sections.delete }));
        expect(actions.onDelete).toHaveBeenCalledWith(section.id);
    });

    it('has no ✕ on a block that cannot be deleted', () => {
        renderBlock({ controls: { canHide: true, canDelete: false, movable: true, canMoveUp: false, canMoveDown: false } });
        expect(screen.queryByRole('button', { name: en.InvitationEditor.sections.delete })).toBeNull();
    });
});
