// The element that scrolls `element`: its nearest ancestor that scrolls, or the page itself.
export function closestScrollContainer(element: HTMLElement | null): HTMLElement {
    for (let node = element?.parentElement ?? null; node; node = node.parentElement) {
        const { overflowY } = getComputedStyle(node);
        if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight) return node;
    }
    return (document.scrollingElement as HTMLElement | null) ?? document.documentElement;
}

// Back to the top of the app's scroll area (the app shell's <main>) and of the page itself.
export function scrollAppToTop(): void {
    const main = document.querySelector('main');
    if (main) main.scrollTop = 0;
    window.scrollTo({ top: 0 });
}
