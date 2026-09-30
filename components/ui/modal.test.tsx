import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Modal } from '@/components/ui/modal';

vi.mock('@/hooks/useOverlayHistory', () => ({ useOverlayHistory: () => ({ requestClose: vi.fn() }) }));

afterEach(cleanup);

function layers() {
    const popup = screen.getByRole('dialog');
    const backdrop = document.querySelector('.motion-overlay');
    return { popup, backdrop };
}

describe('Modal layer', () => {
    it('sits at z-50 by default', () => {
        render(
            <Modal open onClose={vi.fn()} ariaLabel="d">
                <div>content</div>
            </Modal>,
        );

        const { popup, backdrop } = layers();
        expect(popup.className).toContain('z-50');
        expect(popup.className).not.toContain('z-70');
        expect(backdrop?.className).toContain('z-50');
        expect(backdrop?.className).not.toContain('z-70');
    });

    it('sits at z-70, above the z-60 story viewer, for layer="overStory"', () => {
        render(
            <Modal open onClose={vi.fn()} ariaLabel="d" layer="overStory">
                <div>content</div>
            </Modal>,
        );

        const { popup, backdrop } = layers();
        expect(popup.className).toContain('z-70');
        expect(popup.className).not.toContain('z-50');
        expect(backdrop?.className).toContain('z-70');
        expect(backdrop?.className).not.toContain('z-50');
    });
});
