import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AdminIconTip } from '@/components/admin/AdminIconTip';
import { AdminTipBubble } from '@/components/admin/AdminTipBubble';
import { useAdminInfoTip } from '@/hooks/useAdminInfoTip';

afterEach(cleanup);

// A control with a click of its own (like a platform's toggle), wired the way the campaign pages wire one.
function Toggle({ onClickAction }: { onClickAction: () => void }) {
    const { open, triggerRef, bubbleRef, handlers } = useAdminInfoTip();

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                aria-label="Instagram"
                onClick={onClickAction}
                onPointerEnter={handlers.handlePointerEnter}
                onPointerLeave={handlers.handlePointerLeave}
                onPointerUp={handlers.handlePointerUp}
                onFocus={handlers.handleFocus}
                onBlur={handlers.handleBlur}
            >
                IG
            </button>
            {open && <AdminTipBubble bubbleRef={bubbleRef} text="Instagram" />}
        </>
    );
}

describe('AdminIconTip', () => {
    it('is a button named by its word, with the word hidden at first', () => {
        render(
            <AdminIconTip label="Instagram">
                <svg aria-hidden="true" />
            </AdminIconTip>,
        );

        expect(screen.getByRole('button', { name: 'Instagram' })).toHaveAttribute('type', 'button');
        expect(screen.queryByText('Instagram')).toBeNull();
    });

    it('shows its word on keyboard focus and mouse hover', () => {
        render(
            <AdminIconTip label="Instagram">
                <svg aria-hidden="true" />
            </AdminIconTip>,
        );
        const icon = screen.getByRole('button', { name: 'Instagram' });

        act(() => icon.focus());
        expect(screen.getByText('Instagram')).toBeInTheDocument();
        fireEvent.blur(icon);
        expect(screen.queryByText('Instagram')).toBeNull();

        fireEvent.pointerEnter(icon, { pointerType: 'mouse' });
        expect(screen.getByText('Instagram')).toBeInTheDocument();
        fireEvent.pointerLeave(icon, { pointerType: 'mouse' });
        expect(screen.queryByText('Instagram')).toBeNull();
    });

    it('shows its word on a tap without reaching the row around it', () => {
        const handleRowClick = vi.fn();
        render(
            <div onClick={handleRowClick}>
                <AdminIconTip label="Story">
                    <svg aria-hidden="true" />
                </AdminIconTip>
            </div>,
        );

        fireEvent.click(screen.getByRole('button', { name: 'Story' }));

        expect(screen.getByText('Story')).toBeInTheDocument();
        expect(handleRowClick).not.toHaveBeenCalled();
    });

    it('keeps the word out of the screen reader, which already hears the name', () => {
        render(
            <AdminIconTip label="Instagram">
                <svg aria-hidden="true" />
            </AdminIconTip>,
        );

        fireEvent.click(screen.getByRole('button', { name: 'Instagram' }));

        expect(screen.queryByRole('tooltip')).toBeNull();
        expect(screen.getByText('Instagram')).toHaveAttribute('aria-hidden', 'true');
    });
});

describe('a control with its own tip', () => {
    it('shows its word on a tap, and still does its own job', () => {
        const handleClick = vi.fn();
        render(<Toggle onClickAction={handleClick} />);
        const control = screen.getByRole('button', { name: 'Instagram' });

        fireEvent.pointerUp(control, { pointerType: 'touch' });
        fireEvent.click(control);

        expect(screen.getByText('Instagram')).toBeInTheDocument();
        expect(handleClick).toHaveBeenCalledOnce();
    });

    it("doesn't open on a mouse press, which hovering already did", () => {
        render(<Toggle onClickAction={vi.fn()} />);

        fireEvent.pointerUp(screen.getByRole('button', { name: 'Instagram' }), { pointerType: 'mouse' });

        expect(screen.queryByText('Instagram')).toBeNull();
    });
});
