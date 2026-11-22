import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useFeedEditBanner } from '@/hooks/useFeedEditBanner';
import type { EventDetailResponseDto, PaidServiceResponseDto, PlatformModuleResponseDto } from '@/lib/api/types';

const mocks = vi.hoisted(() => ({ flag: true, block: null as string | null, paused: false, addon: { code: 'SMD' } as { code: string } | null }));

vi.mock('@/providers/FeedEditorFlagProvider', () => ({ useFeedEditorEnabled: () => mocks.flag }));
vi.mock('@/hooks/usePurchaseBlock', () => ({ usePurchaseBlock: () => mocks.block }));
vi.mock('@/hooks/useBillingWithdrawals', () => ({ useStoragePurchasePaused: () => mocks.paused }));
vi.mock('@/lib/featureAddons', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/featureAddons')>();
    return { ...actual, saveMyDateAddon: () => mocks.addon };
});

function event(saveMyDate: boolean, eventType = 'WEDDING') {
    return {
        id: 'e-1',
        eventType,
        modules: saveMyDate ? [{ moduleKey: 'save_my_date', isAvailable: true, isEnabled: true }] : [],
    } as unknown as EventDetailResponseDto;
}

function render(saveMyDate: boolean, eventType?: string) {
    return renderHook(() =>
        useFeedEditBanner({
            event: event(saveMyDate, eventType),
            eventStatus: 'ACTIVE',
            paidServices: [] as PaidServiceResponseDto[],
            modules: [] as PlatformModuleResponseDto[],
            currentPlan: undefined,
        }),
    ).result.current;
}

beforeEach(() => {
    mocks.flag = true;
    mocks.block = null;
    mocks.paused = false;
    mocks.addon = { code: 'SMD' };
});

describe('useFeedEditBanner', () => {
    it('links the lock to the add-on', () => {
        expect(render(false)).toEqual({ state: 'locked', href: '/events/e-1/settings/addons?add=SMD' });
    });

    it('links Start editing to edit mode', () => {
        expect(render(true)).toEqual({ state: 'included', href: '/events/e-1/feed?edit=blocks' });
    });

    it('shows both banners on an event type without Save my date themes', () => {
        expect(render(false, 'BIRTHDAY').state).toBe('locked');
        expect(render(true, 'BIRTHDAY').state).toBe('included');
    });

    it('shows no lock to someone who cannot buy, or while purchases are paused', () => {
        mocks.block = 'primaryHostOnly';
        expect(render(false).state).toBeNull();
        mocks.block = null;
        mocks.paused = true;
        expect(render(false).state).toBeNull();
    });
});
