import { act, renderHook } from '@testing-library/react';
import type { MouseEvent } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useAdminRecordPage } from '@/hooks/useAdminRecordPage';
import { CAMPAIGNS_HASH_ROOT } from '@/lib/adminRecordRouting';

function rowClick(target: Element, id: string) {
    const row = document.createElement('tr');
    row.dataset.recordId = id;
    return { target, currentTarget: row } as unknown as MouseEvent<HTMLTableRowElement>;
}

function linkClick(id: string, modifiers: Partial<MouseEvent<HTMLAnchorElement>> = {}) {
    const link = document.createElement('a');
    link.dataset.recordId = id;
    let prevented = false;
    const event = {
        currentTarget: link,
        preventDefault: () => {
            prevented = true;
        },
        ...modifiers,
    } as unknown as MouseEvent<HTMLAnchorElement>;
    return { event, wasPrevented: () => prevented };
}

describe('useAdminRecordPage', () => {
    beforeEach(() => window.history.replaceState(null, '', '/admin#campaigns'));
    afterEach(() => window.history.replaceState(null, '', '/'));

    it('reads a record from the address', () => {
        window.history.replaceState(null, '', '/admin#campaigns/abc');
        const { result } = renderHook(() => useAdminRecordPage(CAMPAIGNS_HASH_ROOT));
        expect(result.current.recordId).toBe('abc');
        expect(result.current.isNew).toBe(false);
    });

    it('reads the new form from the address', () => {
        window.history.replaceState(null, '', '/admin#campaigns/new');
        const { result } = renderHook(() => useAdminRecordPage(CAMPAIGNS_HASH_ROOT));
        expect(result.current.recordId).toBeNull();
        expect(result.current.isNew).toBe(true);
    });

    it('opens a record from a row, but not from a button in it', () => {
        const { result } = renderHook(() => useAdminRecordPage(CAMPAIGNS_HASH_ROOT));
        const cell = document.createElement('td');
        const button = document.createElement('button');
        cell.append(button);

        act(() => result.current.handleRecordRowClick(rowClick(button, 'abc')));
        expect(result.current.recordId).toBeNull();

        act(() => result.current.handleRecordRowClick(rowClick(cell, 'abc')));
        expect(result.current.recordId).toBe('abc');
        expect(window.location.hash).toBe('#campaigns/abc');
    });

    it('leaves a modified click on a link to the browser', () => {
        const { result } = renderHook(() => useAdminRecordPage(CAMPAIGNS_HASH_ROOT));

        const modified = linkClick('abc', { ctrlKey: true });
        act(() => result.current.handleRecordLinkClick(modified.event));
        expect(modified.wasPrevented()).toBe(false);
        expect(result.current.recordId).toBeNull();

        const plain = linkClick('abc');
        act(() => result.current.handleRecordLinkClick(plain.event));
        expect(plain.wasPrevented()).toBe(true);
        expect(result.current.recordId).toBe('abc');
    });

    it('returns to the list', () => {
        window.history.replaceState(null, '', '/admin#campaigns/abc');
        const { result } = renderHook(() => useAdminRecordPage(CAMPAIGNS_HASH_ROOT));

        act(() => result.current.showList());
        expect(result.current.recordId).toBeNull();
        expect(window.location.hash).toBe('#campaigns');
    });
});
