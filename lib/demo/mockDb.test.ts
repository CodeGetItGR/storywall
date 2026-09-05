import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createMockDb } from '@/lib/demo/mockDb';

interface Widget {
    id: string;
    eventId: string;
    label: string;
}

function seed(): { widgets: Widget[] } {
    return { widgets: [{ id: 'w1', eventId: 'e1', label: 'seed' }] };
}

describe('createMockDb', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('starts from the seed when localStorage is empty', () => {
        const db = createMockDb('test:db', seed);
        expect(db.list('widgets')).toEqual([{ id: 'w1', eventId: 'e1', label: 'seed' }]);
    });

    it('persists a create across store instances', () => {
        const db = createMockDb('test:db', seed);
        db.create('widgets', { id: 'w2', eventId: 'e1', label: 'added' });

        const reloaded = createMockDb('test:db', seed);
        expect(reloaded.list('widgets').map((w) => w.id)).toEqual(['w1', 'w2']);
    });

    it('updates a record in place by id', () => {
        const db = createMockDb('test:db', seed);
        db.update('widgets', 'w1', (widget) => ({ ...widget, label: 'changed' }));
        expect(db.get('widgets', 'w1')?.label).toBe('changed');
    });

    it('removes a record by id', () => {
        const db = createMockDb('test:db', seed);
        db.remove('widgets', 'w1');
        expect(db.list('widgets')).toEqual([]);
    });

    it('falls back to the seed if localStorage holds corrupt JSON', () => {
        localStorage.setItem('test:db', '{not json');
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const db = createMockDb('test:db', seed);
        expect(db.list('widgets')).toEqual([{ id: 'w1', eventId: 'e1', label: 'seed' }]);
        warn.mockRestore();
    });

    it('reset() restores the seed and persists it', () => {
        const db = createMockDb('test:db', seed);
        db.create('widgets', { id: 'w2', eventId: 'e1', label: 'added' });
        db.reset();

        const reloaded = createMockDb('test:db', seed);
        expect(reloaded.list('widgets')).toEqual([{ id: 'w1', eventId: 'e1', label: 'seed' }]);
    });
});
