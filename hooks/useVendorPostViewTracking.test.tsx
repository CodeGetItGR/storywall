import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PostResponseDto } from '@/lib/api/types';

const record = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/useContentViews', () => ({ useContentViews: () => record }));
const provider = vi.hoisted(() => ({ member: { id: 'g1' } as { id: string } | null, isHost: false }));
vi.mock('@/providers/EventProvider', () => ({ useActiveMember: () => provider.member, useIsHost: () => provider.isHost }));

import { useVendorPostViewTracking } from '@/hooks/useVendorPostViewTracking';

type Callback = (entries: Array<Partial<IntersectionObserverEntry>>) => void;
let fire: Callback = () => undefined;
const disconnect = vi.fn();

class FakeObserver {
    constructor(callback: Callback) {
        fire = callback;
    }
    observe() {}
    disconnect = disconnect;
}

function Card({ post }: { post: PostResponseDto }) {
    const ref = useVendorPostViewTracking<HTMLElement>(post);
    return <article ref={ref} />;
}

const VENDOR_POST = { id: 'p1', eventId: 'e1', authorMemberId: 'v1', author: { vendorType: 'PHOTOGRAPHER' } } as unknown as PostResponseDto;

describe('useVendorPostViewTracking', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        record.mockReset();
        disconnect.mockReset();
        provider.member = { id: 'g1' };
        provider.isHost = false;
        vi.stubGlobal('IntersectionObserver', FakeObserver);
    });
    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it('records a vendor post half on screen for a second', () => {
        render(<Card post={VENDOR_POST} />);
        fire([{ isIntersecting: true, intersectionRatio: 0.6 }]);
        vi.advanceTimersByTime(999);
        expect(record).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1);
        expect(record).toHaveBeenCalledWith('e1', 'post', 'p1');
    });

    it('does not record a post scrolled past too fast', () => {
        render(<Card post={VENDOR_POST} />);
        fire([{ isIntersecting: true, intersectionRatio: 0.6 }]);
        vi.advanceTimersByTime(500);
        fire([{ isIntersecting: false, intersectionRatio: 0.1 }]);
        vi.advanceTimersByTime(1000);
        expect(record).not.toHaveBeenCalled();
    });

    it('skips guest posts, the vendor themself and hosts', () => {
        const observe = vi.fn();
        vi.stubGlobal(
            'IntersectionObserver',
            class {
                observe = observe;
                disconnect = disconnect;
            },
        );
        render(<Card post={{ ...VENDOR_POST, author: { vendorType: null } } as unknown as PostResponseDto} />);
        provider.member = { id: 'v1' };
        render(<Card post={VENDOR_POST} />);
        provider.member = { id: 'g1' };
        provider.isHost = true;
        render(<Card post={VENDOR_POST} />);
        expect(observe).not.toHaveBeenCalled();
    });
});
