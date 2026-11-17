import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminInfoTip } from '@/components/admin/AdminInfoTip';

afterEach(cleanup);

const LABEL = 'What Visits means';
const TEXT = 'Arrivals through the link.';

const trigger = () => screen.getByRole('button', { name: LABEL });

describe('AdminInfoTip', () => {
    it('is a plain button named by its label, with nothing shown at first', () => {
        render(<AdminInfoTip label={LABEL} text={TEXT} />);

        expect(trigger()).toHaveAttribute('type', 'button');
        expect(trigger()).not.toHaveAttribute('aria-describedby');
        expect(screen.queryByRole('tooltip')).toBeNull();
    });

    it('opens on keyboard focus and describes the button', () => {
        render(<AdminInfoTip label={LABEL} text={TEXT} />);

        act(() => trigger().focus());

        const tip = screen.getByRole('tooltip');
        expect(tip).toHaveTextContent(TEXT);
        expect(trigger()).toHaveAttribute('aria-describedby', tip.id);

        fireEvent.blur(trigger());
        expect(screen.queryByRole('tooltip')).toBeNull();
    });

    it('opens on mouse hover and closes when the mouse leaves', () => {
        render(<AdminInfoTip label={LABEL} text={TEXT} />);

        fireEvent.pointerEnter(trigger(), { pointerType: 'mouse' });
        expect(screen.getByRole('tooltip')).toBeInTheDocument();

        fireEvent.pointerLeave(trigger(), { pointerType: 'mouse' });
        expect(screen.queryByRole('tooltip')).toBeNull();
    });

    it('toggles on a tap', () => {
        render(<AdminInfoTip label={LABEL} text={TEXT} />);

        fireEvent.click(trigger());
        expect(screen.getByRole('tooltip')).toBeInTheDocument();

        fireEvent.click(trigger());
        expect(screen.queryByRole('tooltip')).toBeNull();
    });

    it('closes on Escape', () => {
        render(<AdminInfoTip label={LABEL} text={TEXT} />);
        fireEvent.click(trigger());

        fireEvent.keyDown(trigger(), { key: 'Escape' });

        expect(screen.queryByRole('tooltip')).toBeNull();
    });

    it('closes when something else is pressed, but not when its own icon is', () => {
        render(
            <>
                <AdminInfoTip label={LABEL} text={TEXT} />
                <p>elsewhere</p>
            </>,
        );
        fireEvent.click(trigger());

        fireEvent.pointerDown(trigger());
        expect(screen.getByRole('tooltip')).toBeInTheDocument();

        fireEvent.pointerDown(screen.getByText('elsewhere'));
        expect(screen.queryByRole('tooltip')).toBeNull();
    });

    it('closes on resize', () => {
        render(<AdminInfoTip label={LABEL} text={TEXT} />);
        fireEvent.click(trigger());

        fireEvent.resize(window);

        expect(screen.queryByRole('tooltip')).toBeNull();
    });

    it('closes when a scroll moves the icon, and stays when it does not', () => {
        render(<AdminInfoTip label={LABEL} text={TEXT} />);
        const rect = (top: number) => ({ top, bottom: top + 14, left: 100, right: 114, width: 14, height: 14, x: 100, y: top, toJSON: () => ({}) });
        const spy = vi.spyOn(trigger(), 'getBoundingClientRect').mockReturnValue(rect(50));
        fireEvent.click(trigger());

        fireEvent.scroll(window);
        expect(screen.getByRole('tooltip')).toBeInTheDocument();

        spy.mockReturnValue(rect(20));
        fireEvent.scroll(window);
        expect(screen.queryByRole('tooltip')).toBeNull();
    });

    it('does not reach a click handler around it, such as a sortable header', () => {
        const onHeaderClick = vi.fn();
        render(
            <div onClick={onHeaderClick}>
                <AdminInfoTip label={LABEL} text={TEXT} />
            </div>,
        );

        fireEvent.click(trigger());

        expect(onHeaderClick).not.toHaveBeenCalled();
    });

    it('shows the bubble in the page body, outside a clipping table', () => {
        render(
            <div style={{ overflow: 'auto' }} data-testid="clip">
                <AdminInfoTip label={LABEL} text={TEXT} />
            </div>,
        );
        fireEvent.click(trigger());

        const tip = screen.getByRole('tooltip');
        expect(tip.parentElement).toBe(document.body);
        expect(screen.getByTestId('clip')).not.toContainElement(tip);
        expect(tip).toHaveClass('fixed');
    });

    describe('inside a drawer', () => {
        async function renderDrawer(onClose: () => void) {
            render(
                <AdminDrawer open onClose={onClose} title="Campaign" closeLabel="Close">
                    <AdminInfoTip label={LABEL} text={TEXT} />
                </AdminDrawer>,
            );
            // Overlay history registers in a microtask.
            await act(async () => {
                await Promise.resolve();
            });
        }

        it('opens on tap without closing the drawer', async () => {
            const onClose = vi.fn();
            await renderDrawer(onClose);

            fireEvent.pointerDown(trigger());
            fireEvent.click(trigger());

            expect(screen.getByRole('tooltip')).toBeInTheDocument();
            expect(screen.getByRole('dialog')).toBeInTheDocument();
            expect(onClose).not.toHaveBeenCalled();
        });

        it('closes only the tip on the first Escape, the drawer on the next', async () => {
            const onClose = vi.fn();
            await renderDrawer(onClose);
            fireEvent.click(trigger());

            fireEvent.keyDown(trigger(), { key: 'Escape' });
            expect(screen.queryByRole('tooltip')).toBeNull();
            expect(onClose).not.toHaveBeenCalled();

            fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
            expect(onClose).toHaveBeenCalledOnce();
        });
    });
});
