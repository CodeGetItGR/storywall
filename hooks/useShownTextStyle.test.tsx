import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { useShownTextStyle } from '@/hooks/useShownTextStyle';

function textOnPage() {
    const page = document.createElement('div');
    page.className = 'smd-invitation';
    const text = document.createElement('p');
    text.style.cssText = 'color: rgb(47, 43, 45); font-size: 20px; font-style: italic;';
    page.append(text);
    document.body.append(page);
    return text;
}

describe('useShownTextStyle', () => {
    afterEach(() => document.body.replaceChildren());

    it('reads what the text shows', () => {
        const { result } = renderHook(() => useShownTextStyle(textOnPage()));
        expect(result.current).toEqual({ size: 20, italic: true, bold: false, color: '#2f2b2d' });
    });

    it('shows nothing for no text', () => {
        const { result } = renderHook(() => useShownTextStyle(null));
        expect(result.current).toEqual({ italic: false, bold: false });
    });

    it('follows the page when the text changes look after it opened', async () => {
        const text = textOnPage();
        const { result } = renderHook(() => useShownTextStyle(text));
        act(() => {
            text.style.color = 'rgb(255, 255, 255)';
        });
        await waitFor(() => expect(result.current.color).toBe('#ffffff'));
    });
});
