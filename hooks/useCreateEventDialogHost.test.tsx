import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCreateEventDialogHost } from '@/hooks/useCreateEventDialogHost';
import { writeCreateEventWizardDraft } from '@/lib/createEventWizardDraft';
import { routes } from '@/lib/routes';

const params = vi.hoisted(() => ({ current: new URLSearchParams() }));
const auth = vi.hoisted(() => ({ current: { isBootstrapping: false, user: null as null | { role: string } } }));
const flag = vi.hoisted(() => ({ on: true }));
const router = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useSearchParams: () => params.current, useRouter: () => router }));
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
    auth.current = { isBootstrapping: false, user: null };
    flag.on = true;
    router.replace.mockReset();
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

    it('gets the click before document listeners registered earlier (the landing source tracker)', () => {
        const seen: boolean[] = [];
        const earlier = (event: MouseEvent) => seen.push(event.defaultPrevented);
        document.addEventListener('click', earlier, true);
        try {
            renderHook(() => useCreateEventDialogHost());
            link('/events/new').dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
            expect(seen).toEqual([true]);
        } finally {
            document.removeEventListener('click', earlier, true);
        }
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
        auth.current = { isBootstrapping: false, user: { role: 'ADMIN' } };
        params.current = new URLSearchParams('create=1');
        const { result } = renderHook(() => useCreateEventDialogHost());
        expect(result.current.isOpen).toBe(false);
    });

    it('sends an admin who opens a create=1 link to the console, as /events/new does', () => {
        auth.current = { isBootstrapping: false, user: { role: 'ADMIN' } };
        params.current = new URLSearchParams('create=1');
        renderHook(() => useCreateEventDialogHost());
        expect(router.replace).toHaveBeenCalledWith(routes.admin);
    });

    it('leaves an admin on the page without create=1, while the session loads, or with the flag off', () => {
        auth.current = { isBootstrapping: false, user: { role: 'ADMIN' } };
        const { unmount } = renderHook(() => useCreateEventDialogHost());
        unmount();
        params.current = new URLSearchParams('create=1');
        auth.current = { isBootstrapping: true, user: null };
        renderHook(() => useCreateEventDialogHost()).unmount();
        auth.current = { isBootstrapping: false, user: { role: 'ADMIN' } };
        flag.on = false;
        renderHook(() => useCreateEventDialogHost());
        expect(router.replace).not.toHaveBeenCalled();
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
