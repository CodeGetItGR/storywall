import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCreateEventDialogHost } from '@/hooks/useCreateEventDialogHost';
import { writeCreateEventWizardDraft } from '@/lib/createEventWizardDraft';

const params = vi.hoisted(() => ({ current: new URLSearchParams() }));
const auth = vi.hoisted(() => ({ current: { user: null as null | { role: string } } }));
const flag = vi.hoisted(() => ({ on: true }));
vi.mock('next/navigation', () => ({ useSearchParams: () => params.current }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => auth.current }));
vi.mock('@/providers/CreateWizardFlagProvider', () => ({ useCreateWizardEnabled: () => flag.on }));

function link(href: string) {
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.textContent = 'Create an event';
    document.body.append(anchor);
    return anchor;
}

beforeEach(() => {
    window.history.replaceState(null, '', '/el');
    params.current = new URLSearchParams();
    auth.current = { user: null };
    flag.on = true;
});

afterEach(() => {
    // Vitest runs without globals here, so Testing Library doesn't unmount on its own; a hook left
    // mounted would keep its document listeners into the next test.
    cleanup();
    document.body.innerHTML = '';
    window.localStorage.clear();
});

describe('useCreateEventDialogHost', () => {
    it('opens on create=1', () => {
        params.current = new URLSearchParams('create=1');
        expect(renderHook(() => useCreateEventDialogHost()).result.current.isOpen).toBe(true);
    });

    it('turns a click on a create link into the pop-up over this page', () => {
        renderHook(() => useCreateEventDialogHost());
        const anchor = link('/events/new?type=baptism');
        const click = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
        anchor.dispatchEvent(click);
        expect(click.defaultPrevented).toBe(true);
        expect(`${window.location.pathname}${window.location.search}`).toBe('/el?create=1&type=baptism');
    });

    it('leaves new-tab clicks and other links alone', () => {
        renderHook(() => useCreateEventDialogHost());
        const create = link('/events/new');
        const ctrl = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ctrlKey: true });
        create.dispatchEvent(ctrl);
        expect(ctrl.defaultPrevented).toBe(false);
        const other = link('/pricing');
        const plain = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
        other.dispatchEvent(plain);
        expect(plain.defaultPrevented).toBe(false);
    });

    it('does nothing with the flag off or for an admin', () => {
        flag.on = false;
        const { unmount } = renderHook(() => useCreateEventDialogHost());
        const first = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
        link('/events/new').dispatchEvent(first);
        expect(first.defaultPrevented).toBe(false);
        unmount();

        flag.on = true;
        auth.current = { user: { role: 'ADMIN' } };
        params.current = new URLSearchParams('create=1');
        const { result } = renderHook(() => useCreateEventDialogHost());
        expect(result.current.isOpen).toBe(false);
    });

    it('stays shut with the flag off, even on create=1, and leaves the URL alone', () => {
        flag.on = false;
        params.current = new URLSearchParams('create=1');
        const { result } = renderHook(() => useCreateEventDialogHost());
        expect(result.current.isOpen).toBe(false);
        const click = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
        link('/events/new?type=baptism').dispatchEvent(click);
        expect(click.defaultPrevented).toBe(false);
        expect(`${window.location.pathname}${window.location.search}`).toBe('/el');
    });

    it('closing from the type step with nothing typed forgets the run', () => {
        writeCreateEventWizardDraft({
            run: 'r1',
            step: 'type',
            eventType: null,
            planCode: '',
            durationPicks: {},
            title: '',
            startAt: '',
            timezone: '',
            locationName: '',
            locationAddress: '',
            mapsUrl: '',
            themePresetId: null,
            gift: { isGift: false, details: { recipientLabel: '', giverDisplayName: '', recipientEmail: '' } },
            checkoutCode: '',
        });
        params.current = new URLSearchParams('create=1&step=type');
        const { result } = renderHook(() => useCreateEventDialogHost());
        act(() => result.current.close());
        expect(window.localStorage.getItem('storywall.createEventWizard')).toBeNull();
    });
});
