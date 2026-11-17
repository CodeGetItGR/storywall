import { act, cleanup, render, screen } from '@testing-library/react';
import { useCallback } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { QrLandingView } from '@/hooks/useQrLanding';
import { useQrViewScroll } from '@/hooks/useQrViewScroll';
import type { QrLandingChoice } from '@/lib/qrLanding';

function Screen({ view, onChoose }: { view: QrLandingView; onChoose: (choice: QrLandingChoice) => void }) {
    const { ref, choose } = useQrViewScroll(view, onChoose);
    const handleClick = useCallback(() => choose('upload'), [choose]);
    return (
        <div ref={ref}>
            <button type="button" onClick={handleClick}>
                {view}
            </button>
        </div>
    );
}

function renderInScroller(view: QrLandingView, onChoose = vi.fn()) {
    const scroller = document.createElement('div');
    scroller.style.overflowY = 'auto';
    Object.defineProperty(scroller, 'scrollHeight', { value: 2000 });
    Object.defineProperty(scroller, 'clientHeight', { value: 600 });
    document.body.appendChild(scroller);
    const utils = render(<Screen view={view} onChoose={onChoose} />, { container: scroller });
    return { scroller, onChoose, rerender: (next: QrLandingView) => utils.rerender(<Screen view={next} onChoose={onChoose} />) };
}

// The choices and the forms share one page: a form opens at the top, back returns to where the guest was.
describe('useQrViewScroll', () => {
    afterEach(() => {
        cleanup();
        document.body.innerHTML = '';
    });

    it('opens the form at the top and brings the choices back to the same spot', () => {
        const { scroller, onChoose, rerender } = renderInScroller('chooser');
        scroller.scrollTop = 480;

        act(() => screen.getByRole('button').click());
        expect(onChoose).toHaveBeenCalledWith('upload');
        rerender('upload');
        expect(scroller.scrollTop).toBe(0);

        scroller.scrollTop = 120;
        rerender('chooser');
        expect(scroller.scrollTop).toBe(480);
    });

    it('leaves the page alone when a form opens without a choice', () => {
        const { scroller, rerender } = renderInScroller('chooser');
        scroller.scrollTop = 300;

        rerender('upload');

        expect(scroller.scrollTop).toBe(300);
    });
});
