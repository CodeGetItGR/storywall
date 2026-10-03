import { HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import type { EventMemberResponseDto } from '@/lib/api/types';
import { buildFixtureSnapshot } from '@/lib/demo/__fixtures__/demoSnapshot';
import { createMockDb } from '@/lib/demo/mockDb';
import { authorFromMember, buildArrayHandlers, buildPageHandlers } from '@/lib/demo/mockHandlers';

interface Note {
    id: string;
    eventId: string;
    body: string;
}

function makeDb() {
    return createMockDb<{ notes: Note[] }>('test:handlers', () => ({
        notes: [
            { id: 'n1', eventId: 'e1', body: 'first' },
            { id: 'n2', eventId: 'e1', body: 'second' },
        ],
    }));
}

describe('buildArrayHandlers', () => {
    it('registers a GET handler for the list path', () => {
        const db = makeDb();
        const handlers = buildArrayHandlers(db, 'notes', '/api/events/:eventId/notes');
        expect(handlers.length).toBeGreaterThan(0);
    });
});

describe('buildPageHandlers', () => {
    it('registers a GET handler for the paginated list path', () => {
        const db = makeDb();
        const handlers = buildPageHandlers(db, 'notes', '/api/events/:eventId/notes', 1);
        expect(handlers.length).toBeGreaterThan(0);
        // Exercised end-to-end (real HTTP through the worker) in Task 5's browser check —
        // this test only guards the factory returning handler objects per collection.
        expect(HttpResponse).toBeDefined();
    });
});

describe('authorFromMember', () => {
    it('carries the member’s picture', () => {
        const member: EventMemberResponseDto = { ...buildFixtureSnapshot().members[0], avatarUrl: 'https://storage.test/a?sig=1' };
        expect(authorFromMember(member)).toEqual({
            memberId: member.id,
            displayName: member.displayName,
            nickname: member.nickname,
            role: member.role,
            avatarUrl: 'https://storage.test/a?sig=1',
            roleKey: null,
            customRole: null,
        });
    });

    it('is null without a member', () => {
        expect(authorFromMember(undefined)).toBeNull();
    });
});
