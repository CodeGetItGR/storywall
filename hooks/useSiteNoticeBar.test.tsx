import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { DiscountCampaignLiveDto, SiteNoticeLiveDto } from '@/lib/api/types';

const state = vi.hoisted(() => ({
    notices: [] as SiteNoticeLiveDto[],
    apiDown: false,
    campaign: null as DiscountCampaignLiveDto | null,
}));
vi.mock('@/hooks/useLiveDiscountCampaign', () => ({ useLiveDiscountCampaign: () => state.campaign }));
vi.mock('@/hooks/useSiteNotices', () => ({ useSiteNotices: () => ({ data: state.notices }) }));
vi.mock('@/hooks/useApiHealth', () => ({ useApiDown: () => state.apiDown }));
vi.mock('next-intl', () => ({ useLocale: () => 'el', useTranslations: () => (key: string) => key }));

import { useSiteNoticeBar } from '@/hooks/useSiteNoticeBar';
import { DISMISSED_COOKIE } from '@/lib/siteNoticeDismissals';

const offer: SiteNoticeLiveDto = {
    id: 'n1',
    version: 1,
    tone: 'OFFER',
    message: { en: '20% off', el: '20% έκπτωση' },
    linkUrl: '/pricing',
    linkLabel: { en: 'See plans', el: 'Δείτε τα πακέτα' },
    areas: ['PUBLIC'],
    dismissible: true,
    startsAt: null,
    createdAt: '2026-10-01T00:00:00Z',
};

describe('useSiteNoticeBar', () => {
    afterEach(() => {
        state.notices = [];
        state.apiDown = false;
        state.campaign = null;
        document.cookie = `${DISMISSED_COOKIE}=; Max-Age=0; Path=/`;
    });

    it('shows the matching notice in the current locale', () => {
        state.notices = [offer];
        const { result } = renderHook(() => useSiteNoticeBar('PUBLIC', ''));
        expect(result.current).toMatchObject({ tone: 'OFFER', message: '20% έκπτωση', link: { href: '/pricing', label: 'Δείτε τα πακέτα' } });
    });

    it('hides a notice once it is closed', () => {
        state.notices = [offer];
        const { result } = renderHook(() => useSiteNoticeBar('PUBLIC', ''));
        act(() => result.current?.onDismiss?.());
        expect(result.current).toBeNull();
    });

    it('respects a dismissal already stored in the cookie', () => {
        state.notices = [offer];
        document.cookie = `${DISMISSED_COOKIE}=n1%3A1; Path=/`;
        const { result } = renderHook(() => useSiteNoticeBar('PUBLIC', 'n1:1'));
        expect(result.current).toBeNull();
    });

    it('swaps in the built-in outage notice while Spring is down, even over admin notices', () => {
        state.notices = [offer];
        state.apiDown = true;
        const { result } = renderHook(() => useSiteNoticeBar('PUBLIC', ''));
        expect(result.current).toMatchObject({ tone: 'CRITICAL', message: 'apiDown', link: null, onDismiss: null });
    });

    it('shows nothing where the bar is hidden, outage included', () => {
        state.apiDown = true;
        const { result } = renderHook(() => useSiteNoticeBar(null, ''));
        expect(result.current).toBeNull();
    });

    const campaign: DiscountCampaignLiveDto = { id: 'c1', percent: 20, startsAt: '2026-11-01T00:00:00Z', endsAt: '2026-11-08T00:00:00Z' };

    it('shows the campaign, with its end and a link to the plans', () => {
        state.campaign = campaign;
        const { result } = renderHook(() => useSiteNoticeBar('PUBLIC', ''));
        expect(result.current).toMatchObject({
            tone: 'OFFER',
            message: 'campaign',
            link: { href: '/el#pricing', label: 'seePlans' },
            countdownEndsAt: campaign.endsAt,
        });
    });

    it('takes the bar from an offer but not from a warning', () => {
        state.campaign = campaign;
        state.notices = [offer];
        const { result, rerender } = renderHook(() => useSiteNoticeBar('PUBLIC', ''));
        expect(result.current?.message).toBe('campaign');

        state.notices = [{ ...offer, tone: 'WARNING' }];
        rerender();
        expect(result.current?.message).toBe('20% έκπτωση');
    });

    it('gives way to the notice once closed', () => {
        state.campaign = campaign;
        state.notices = [offer];
        const { result } = renderHook(() => useSiteNoticeBar('PUBLIC', ''));
        act(() => result.current?.onDismiss?.());
        expect(result.current?.message).toBe('20% έκπτωση');
    });

    it('never shows to a guest', () => {
        state.campaign = campaign;
        const { result } = renderHook(() => useSiteNoticeBar('GUEST', ''));
        expect(result.current).toBeNull();
    });

    it('loses to the outage notice', () => {
        state.campaign = campaign;
        state.apiDown = true;
        const { result } = renderHook(() => useSiteNoticeBar('PUBLIC', ''));
        expect(result.current?.tone).toBe('CRITICAL');
    });
});
