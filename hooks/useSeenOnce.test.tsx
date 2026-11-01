import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSeenOnce } from '@/hooks/useSeenOnce';

type Callback = (entries: Array<Partial<IntersectionObserverEntry>>) => void;
let fire: Callback = () => undefined;
const observe = vi.fn();
const disconnect = vi.fn();

class FakeObserver {
    constructor(callback: Callback) {
        fire = callback;
    }
    observe = observe;
    disconnect = disconnect;
}

const onSeen = vi.fn();

function Card({ enabled }: { enabled: boolean }) {
    const ref = useSeenOnce<HTMLDivElement>(onSeen, enabled);
    return <div ref={ref} />;
}

describe('useSeenOnce', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        onSeen.mockReset();
        observe.mockReset();
        disconnect.mockReset();
        vi.stubGlobal('IntersectionObserver', FakeObserver);
    });
    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it('reports once after half the element stays on screen for a second', () => {
        render(<Card enabled />);
        fire([{ isIntersecting: true, intersectionRatio: 0.6 }]);
        vi.advanceTimersByTime(999);
        expect(onSeen).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1);
        expect(onSeen).toHaveBeenCalledOnce();
        expect(disconnect).toHaveBeenCalled();
    });

    it('does not report an element scrolled past too fast', () => {
        render(<Card enabled />);
        fire([{ isIntersecting: true, intersectionRatio: 0.6 }]);
        vi.advanceTimersByTime(500);
        fire([{ isIntersecting: false, intersectionRatio: 0.1 }]);
        vi.advanceTimersByTime(1000);
        expect(onSeen).not.toHaveBeenCalled();
    });

    it('does not watch while disabled', () => {
        render(<Card enabled={false} />);
        expect(observe).not.toHaveBeenCalled();
    });
});
