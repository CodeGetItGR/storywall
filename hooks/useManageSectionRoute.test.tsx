// hooks/useManageSectionRoute.test.tsx
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useManageSectionRoute } from '@/hooks/useManageSectionRoute';
import type { ManageSection } from '@/lib/manageSections';
import { routes } from '@/lib/routes';

const mocks = vi.hoisted(() => ({ query: '', replacePageUrl: vi.fn(), pushPageEntry: vi.fn() }));
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(mocks.query) }));
vi.mock('@/lib/overlayHistory', () => ({ replacePageUrl: mocks.replacePageUrl, pushPageEntry: mocks.pushPageEntry }));

const visibleSections: ManageSection[] = ['overview', 'settings', 'rsvp', 'members', 'billing'];
const options = { eventId: 'e1', isDraft: false, isDeleted: false, visibleSections, pendingSections: [] };

beforeEach(() => {
    mocks.replacePageUrl.mockClear();
    mocks.pushPageEntry.mockClear();
    window.history.replaceState(null, '');
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    vi.spyOn(window.history, 'back').mockImplementation(() => undefined);
});

describe('useManageSectionRoute', () => {
    it('opens the section the URL asks for', () => {
        mocks.query = 'tab=settings';
        expect(renderHook(() => useManageSectionRoute(options)).result.current.section).toBe('settings');
        expect(mocks.replacePageUrl).not.toHaveBeenCalled();
    });

    it('sends a hidden section back to the overview', () => {
        mocks.query = 'tab=theme';
        const { result } = renderHook(() => useManageSectionRoute(options));
        expect(result.current.section).toBe('overview');
        expect(mocks.replacePageUrl).toHaveBeenCalledWith(routes.events.manage('e1'));
    });

    it('treats an unknown section as the overview without rewriting the URL', () => {
        mocks.query = 'tab=help';
        expect(renderHook(() => useManageSectionRoute(options)).result.current.section).toBe('overview');
        expect(mocks.replacePageUrl).not.toHaveBeenCalled();
    });

    // On a phone the Overview is the menu, so Back from a section must return to it.
    it('leaving the overview adds a Back step and scrolls to the top', () => {
        mocks.query = '';
        const { result } = renderHook(() => useManageSectionRoute(options));
        act(() => result.current.navigateToSection('rsvp'));
        expect(mocks.pushPageEntry).toHaveBeenCalledWith(`${routes.events.manage('e1')}?tab=rsvp`, { manageOpenedFromOverview: true });
        expect(mocks.replacePageUrl).not.toHaveBeenCalled();
        expect(window.scrollTo).toHaveBeenCalled();
    });

    it('moving between sections replaces the entry', () => {
        mocks.query = 'tab=rsvp';
        const { result } = renderHook(() => useManageSectionRoute(options));
        act(() => result.current.navigateToSection('billing'));
        expect(mocks.replacePageUrl).toHaveBeenCalledWith(`${routes.events.manage('e1')}?tab=billing`);
        expect(mocks.pushPageEntry).not.toHaveBeenCalled();
    });

    it('steps back to the overview it was opened from', () => {
        mocks.query = 'tab=rsvp';
        window.history.replaceState({ manageOpenedFromOverview: true }, '');
        const { result } = renderHook(() => useManageSectionRoute(options));
        act(() => result.current.navigateToSection('overview'));
        expect(window.history.back).toHaveBeenCalled();
        expect(mocks.replacePageUrl).not.toHaveBeenCalled();
    });

    it('drops ?tab= when going to the overview from a section opened directly', () => {
        mocks.query = 'tab=rsvp';
        const { result } = renderHook(() => useManageSectionRoute(options));
        act(() => result.current.navigateToSection('overview'));
        expect(window.history.back).not.toHaveBeenCalled();
        expect(mocks.replacePageUrl).toHaveBeenLastCalledWith(routes.events.manage('e1'));
    });

    it('reads the cancelled checkout flag', () => {
        mocks.query = 'cancelled=true';
        expect(renderHook(() => useManageSectionRoute(options)).result.current.cancelledCheckout).toBe(true);
    });
});
