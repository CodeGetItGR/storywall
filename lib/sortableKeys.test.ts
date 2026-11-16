import type { BaseUIEvent } from '@base-ui/react/types';
import type { KeyboardEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { letDragKeysThrough } from '@/lib/sortableKeys';

function keyFrom(target: Element) {
    return { target, preventBaseUIHandler: vi.fn() } as unknown as BaseUIEvent<KeyboardEvent> & { preventBaseUIHandler: ReturnType<typeof vi.fn> };
}

describe('letDragKeysThrough', () => {
    it('lets keys from a drag handle out of the dialog', () => {
        const handle = document.createElement('button');
        handle.setAttribute('aria-roledescription', 'sortable');
        const event = keyFrom(handle);
        letDragKeysThrough(event);
        expect(event.preventBaseUIHandler).toHaveBeenCalledOnce();
    });

    it('keeps other keys inside the dialog', () => {
        const event = keyFrom(document.createElement('input'));
        letDragKeysThrough(event);
        expect(event.preventBaseUIHandler).not.toHaveBeenCalled();
    });
});
