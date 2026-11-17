import { cleanup, renderHook } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { campaignDetailFixture, campaignListFixture } from '@/components/admin/campaigns/__fixtures__/campaigns';
import { useCampaignDetail } from '@/hooks/useCampaignDetail';
import type { FunnelBounds } from '@/lib/adminFunnel';
import { ApiError } from '@/lib/api/client';
import type { CampaignDetailDto } from '@/lib/api/types';
import messages from '@/messages/en.json';

const queries = vi.hoisted(() => ({ detail: undefined as CampaignDetailDto | undefined, error: null as unknown }));
vi.mock('@/hooks/useAdminCampaignApi', () => ({
    useCampaignDetailQuery: () => ({
        data: queries.detail,
        isLoading: false,
        isFetching: false,
        error: queries.error,
        dataUpdatedAt: 0,
        refetch: vi.fn(),
    }),
    useCampaignListQuery: () => ({ data: campaignListFixture, isLoading: false, isFetching: false, error: null, dataUpdatedAt: 0, refetch: vi.fn() }),
}));

const bounds = { since: '2026-05-16T21:00:00Z', until: null, isValid: true } as FunnelBounds;

function wrapper({ children }: { children: ReactNode }) {
    return (
        <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
            {children}
        </NextIntlClientProvider>
    );
}

describe('useCampaignDetail', () => {
    beforeEach(() => {
        queries.detail = campaignDetailFixture;
        queries.error = null;
    });
    afterEach(cleanup);

    it('works out the funnel, the platforms and the days', () => {
        const { result } = renderHook(() => useCampaignDetail('launch', bounds, vi.fn()), { wrapper });

        expect(result.current.view?.funnel[0]).toMatchObject({ step: 'visitors', value: 1240 });
        expect(result.current.view?.platforms.map((row) => row.platform)).toEqual(['instagram', 'facebook', 'google', 'email', 'partner']);
        expect(result.current.view?.measure).toBe('sales');
        expect(result.current.view?.dailyRows).toHaveLength(30);
    });

    it('compares the campaign with the other campaigns in the list', () => {
        const { result } = renderHook(() => useCampaignDetail('launch', bounds, vi.fn()), { wrapper });

        expect(result.current.view?.verdict).toMatchObject({ kind: 'better', measure: 'sales' });
        expect(result.current.others.map((campaign) => campaign.id)).not.toContain('launch');
    });

    it('names the tab that lists it', () => {
        queries.detail = { ...campaignDetailFixture, campaign: { ...campaignDetailFixture.campaign, status: 'ENDED' } };
        const { result } = renderHook(() => useCampaignDetail('launch', bounds, vi.fn()), { wrapper });

        expect(result.current.tab).toBe('past');
    });

    it('hands a campaign that no longer exists back, without an error', () => {
        queries.detail = undefined;
        queries.error = new ApiError(404, {});
        const onNotFound = vi.fn();
        const { result } = renderHook(() => useCampaignDetail('gone', bounds, onNotFound), { wrapper });

        expect(onNotFound).toHaveBeenCalled();
        expect(result.current.error).toBeNull();
    });
});
