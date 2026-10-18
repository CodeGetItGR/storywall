import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { useHideMobileTabBarWhileTyping } from '@/hooks/useHideMobileTabBarWhileTyping';
import { MobileChromeProvider, useMobileChrome } from '@/providers/MobileChromeProvider';

// On a phone the tab bar hides while a text field is focused and the keyboard is
// up, and comes back once focus leaves the field.

let coarsePointer = true;

beforeEach(() => {
    coarsePointer = true;
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query === '(pointer: coarse)' && coarsePointer, media: query }));
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    document.body.replaceChildren();
});

function wrapper({ children }: { children: React.ReactNode }) {
    return <MobileChromeProvider>{children}</MobileChromeProvider>;
}

function renderTabBarState() {
    return renderHook(
        () => {
            useHideMobileTabBarWhileTyping();
            return useMobileChrome().isMobileTabBarHidden;
        },
        { wrapper },
    );
}

function addField(tag: 'textarea' | 'input', type?: string) {
    const field = document.createElement(tag);
    if (type) field.setAttribute('type', type);
    document.body.append(field);
    return field;
}

it('hides the tab bar while a text field is focused on a touch screen', async () => {
    const field = addField('textarea');
    const { result } = renderTabBarState();
    expect(result.current).toBe(false);

    act(() => field.focus());
    await waitFor(() => expect(result.current).toBe(true));

    act(() => field.blur());
    await waitFor(() => expect(result.current).toBe(false));
});

it('stays hidden when focus moves straight to another text field', async () => {
    const first = addField('input', 'text');
    const second = addField('textarea');
    const { result } = renderTabBarState();

    act(() => first.focus());
    await waitFor(() => expect(result.current).toBe(true));

    const seen: boolean[] = [];
    act(() => second.focus());
    seen.push(result.current);
    await new Promise((resolve) => requestAnimationFrame(resolve));
    seen.push(result.current);
    expect(seen).toEqual([true, true]);
});

it('keeps the tab bar for controls that open no keyboard', async () => {
    const checkbox = addField('input', 'checkbox');
    const { result } = renderTabBarState();

    act(() => checkbox.focus());
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(result.current).toBe(false);
});

it('keeps the tab bar on screens without touch', async () => {
    coarsePointer = false;
    const field = addField('textarea');
    const { result } = renderTabBarState();

    act(() => field.focus());
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(result.current).toBe(false);
});
