import { describe, expect, it } from 'vitest';

import type { EventHostResponseDto, EventMemberResponseDto } from '@/lib/api/types';

import { guestMembers, sortHosts } from './eventMembers';

const member = (id: string) => ({ id, displayName: id }) as unknown as EventMemberResponseDto;
const host = (id: string, memberId: string, displayOrder: number) => ({ id, memberId, displayOrder }) as unknown as EventHostResponseDto;

describe('guestMembers', () => {
    it('leaves out every member who is a host', () => {
        expect(guestMembers([member('m1'), member('m2'), member('m3')], [host('h1', 'm1', 0), host('h2', 'm3', 1)])).toEqual([member('m2')]);
    });
});

describe('sortHosts', () => {
    it('puts the primary host first, then by display order', () => {
        const sorted = sortHosts([host('h2', 'm2', 2), host('h0', 'm0', 0), host('h1', 'm1', 1)]);
        expect(sorted.map((item) => item.id)).toEqual(['h0', 'h1', 'h2']);
    });

    it('does not change the list it was given', () => {
        const hosts = [host('h2', 'm2', 2), host('h0', 'm0', 0)];
        sortHosts(hosts);
        expect(hosts[0].id).toBe('h2');
    });
});
