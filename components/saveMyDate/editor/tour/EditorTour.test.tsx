import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EditorTour } from '@/components/saveMyDate/editor/tour/EditorTour';
import type { EditorTourState } from '@/hooks/useEditorTour';
import { EDITOR_TOUR_STEPS } from '@/lib/invitation/editorTour';
import en from '@/messages/en.json';

function tourAt(index: number | null, actions: Partial<EditorTourState> = {}): EditorTourState {
    const last = EDITOR_TOUR_STEPS.length - 1;
    return {
        isOpen: index !== null,
        step: index === null ? null : EDITOR_TOUR_STEPS[index],
        index: index ?? 0,
        total: EDITOR_TOUR_STEPS.length,
        isFirst: index === 0,
        isLast: index === last,
        start: vi.fn(),
        next: vi.fn(),
        back: vi.fn(),
        close: vi.fn(),
        ...actions,
    };
}

// jsdom draws nothing, so there is nothing to scroll to.
Element.prototype.scrollIntoView = () => {};

function renderTour(tour: EditorTourState, { withAddButton = false } = {}) {
    render(
        <NextIntlClientProvider locale="en" messages={en}>
            {withAddButton && <button type="button" data-editor-tour="add" />}
            <EditorTour tour={tour} />
        </NextIntlClientProvider>,
    );
}

describe('EditorTour', () => {
    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    it('shows nothing when closed', () => {
        renderTour(tourAt(null));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('dims the whole editor for a step with nothing to light', () => {
        renderTour(tourAt(0));
        const card = screen.getByRole('dialog', { name: 'Welcome' });
        expect(card).toHaveAccessibleDescription(/Your invitation is ready\./);
        expect(card).toHaveTextContent('1 / 6');
        expect(screen.getByRole('button', { name: 'Next' })).toHaveFocus();
        expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();
    });

    it('lights the part the step talks about', async () => {
        vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
            left: 100,
            top: 200,
            width: 40,
            height: 40,
            right: 140,
            bottom: 240,
        } as DOMRect);
        renderTour(tourAt(2), { withAddButton: true });

        const shade = () => document.querySelector<HTMLElement>('[data-editor-tour-overlay] > [aria-hidden="true"]');
        await waitFor(() => expect(shade()?.style.left).toBe('92px'));
        expect(shade()?.style.top).toBe('192px');
        expect(screen.getByRole('dialog', { name: 'Add a section' })).toBeInTheDocument();
    });

    it('lists the section tools on their step', () => {
        renderTour(tourAt(4));
        const card = screen.getByRole('dialog', { name: 'Section tools' });
        // In the order the section's toolbar shows them.
        const rows = within(card)
            .getAllByRole('listitem')
            .map((row) => row.textContent);
        expect(rows).toEqual(['Hide section', 'Section settings', 'Drag to move', 'Section options']);
    });

    it('moves on, steps back, skips, and closes on Escape', () => {
        const tour = tourAt(3);
        renderTour(tour);
        fireEvent.click(screen.getByRole('button', { name: 'Next' }));
        fireEvent.click(screen.getByRole('button', { name: 'Back' }));
        fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
        fireEvent.keyDown(document, { key: 'Escape' });

        expect(tour.next).toHaveBeenCalledOnce();
        expect(tour.back).toHaveBeenCalledOnce();
        expect(tour.close).toHaveBeenCalledTimes(2);
    });

    it('says Done on the last step', () => {
        const tour = tourAt(5);
        renderTour(tour);
        fireEvent.click(screen.getByRole('button', { name: 'Done' }));
        expect(tour.next).toHaveBeenCalledOnce();
    });

    it('keeps Tab inside the card', () => {
        renderTour(tourAt(3));
        const next = screen.getByRole('button', { name: 'Next' });
        next.focus();
        fireEvent.keyDown(document, { key: 'Tab' });
        expect(screen.getByRole('button', { name: 'Skip' })).toHaveFocus();
    });
});
