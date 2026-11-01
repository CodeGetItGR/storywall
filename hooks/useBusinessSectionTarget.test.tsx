import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useBusinessSectionTarget } from './useBusinessSectionTarget';

const mocks = vi.hoisted(() => ({ section: null as string | null, replacePageUrl: vi.fn() }));

vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(mocks.section ? `section=${mocks.section}` : '') }));
vi.mock('@/lib/overlayHistory', () => ({ replacePageUrl: mocks.replacePageUrl }));

describe('useBusinessSectionTarget', () => {
    const scrollIntoView = vi.fn();

    beforeEach(() => {
        mocks.replacePageUrl.mockReset();
        scrollIntoView.mockReset();
        window.history.replaceState(null, '', '/business?section=printPrices');
        document.body.innerHTML = '<div id="print-prices"></div>';
        document.getElementById('print-prices')!.scrollIntoView = scrollIntoView;
    });
    afterEach(cleanup);

    it('waits for the sections, then scrolls to print prices and drops the param', () => {
        mocks.section = 'printPrices';
        const { rerender } = renderHook((ready: boolean) => useBusinessSectionTarget(ready), { initialProps: false });
        expect(scrollIntoView).not.toHaveBeenCalled();

        rerender(true);
        expect(scrollIntoView).toHaveBeenCalledTimes(1);
        expect(mocks.replacePageUrl).toHaveBeenCalledWith('/business');
    });

    it('ignores anything that is not a section of the page', () => {
        mocks.section = 'schedule';
        renderHook(() => useBusinessSectionTarget(true));
        expect(scrollIntoView).not.toHaveBeenCalled();
        expect(mocks.replacePageUrl).not.toHaveBeenCalled();
    });
});
