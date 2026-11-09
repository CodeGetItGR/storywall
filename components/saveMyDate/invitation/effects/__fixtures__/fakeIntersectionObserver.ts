import { vi } from 'vitest';

// A stand-in IntersectionObserver for tests: `show` tells observers an element
// came on or went off screen.
export function stubIntersectionObserver() {
    const observers = new Set<FakeObserver>();

    class FakeObserver {
        targets = new Set<Element>();
        options: IntersectionObserverInit | undefined;
        constructor(
            private callback: (entries: IntersectionObserverEntry[]) => void,
            options?: IntersectionObserverInit,
        ) {
            this.options = options;
            observers.add(this);
        }
        observe = (target: Element) => void this.targets.add(target);
        unobserve = (target: Element) => void this.targets.delete(target);
        disconnect = () => {
            this.targets.clear();
            observers.delete(this);
        };
        emit(target: Element, isIntersecting: boolean) {
            if (this.targets.has(target)) {
                this.callback([{ target, isIntersecting, intersectionRatio: isIntersecting ? 1 : 0 } as IntersectionObserverEntry]);
            }
        }
    }

    vi.stubGlobal('IntersectionObserver', FakeObserver);
    return {
        show: (target: Element, isIntersecting = true) => [...observers].forEach((observer) => observer.emit(target, isIntersecting)),
        options: () => [...observers].map((observer) => observer.options),
        count: () => observers.size,
        watching: (target: Element) => [...observers].some((observer) => observer.targets.has(target)),
    };
}

// Gives an element a place on the page; jsdom lays nothing out.
export function placeElement(element: Element, top: number, height = 100) {
    element.getBoundingClientRect = () => ({ top, bottom: top + height, left: 0, right: 375, width: 375, height }) as DOMRect;
}
