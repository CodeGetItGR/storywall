import { describe, expect, it } from 'vitest';

import { endpoints } from '@/lib/api/endpoints';

describe('endpoints.admin.campaigns', () => {
    it('adds only the range bounds it has', () => {
        expect(endpoints.admin.campaigns.list(null, null)).toBe('/api/admin/campaigns');
        expect(endpoints.admin.campaigns.list('2026-11-01T00:00:00+02:00', null)).toBe('/api/admin/campaigns?since=2026-11-01T00%3A00%3A00%2B02%3A00');
        expect(endpoints.admin.campaigns.detail('c-1', '2026-11-01T00:00:00Z', '2026-11-08T00:00:00Z')).toBe(
            '/api/admin/campaigns/c-1?since=2026-11-01T00%3A00%3A00Z&until=2026-11-08T00%3A00%3A00Z',
        );
    });

    it('names each write', () => {
        expect(endpoints.admin.campaigns.create).toBe('/api/admin/campaigns');
        expect(endpoints.admin.campaigns.byId('c-1')).toBe('/api/admin/campaigns/c-1');
        expect(endpoints.admin.campaigns.archive('c-1')).toBe('/api/admin/campaigns/c-1/archive');
        expect(endpoints.admin.campaigns.unarchive('c-1')).toBe('/api/admin/campaigns/c-1/unarchive');
        expect(endpoints.admin.campaigns.stop('c-1')).toBe('/api/admin/campaigns/c-1/stop');
        expect(endpoints.admin.campaigns.links('c-1')).toBe('/api/admin/campaigns/c-1/links');
    });
});
