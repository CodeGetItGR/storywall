// A story's play function and its visual capture start from a page whose fonts and images have loaded. Before
// that, a tooltip is placed with the fallback font's width and a scroll lands where the page was before its
// photos grew, and both stay that way.

// The longest a story waits. A font or image that never arrives still fails the capture, which checks them itself.
export const ASSET_TIMEOUT_MS = 10_000;

// A frame, or a short pause in a hidden tab, where frames don't run.
const nextFrame = () =>
    new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, 50);
        requestAnimationFrame(() => {
            clearTimeout(timer);
            resolve();
        });
    });

const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// A lazy image below the fold would load only during the capture's full-page shot, moving the page then, and one in
// a hidden slide would never load at all.
const loadLazyImages = () => document.querySelectorAll('img[loading="lazy"]').forEach((image) => image.setAttribute('loading', 'eager'));

// A broken image counts as complete too, and the capture reports it.
const allLoaded = () => document.fonts.status === 'loaded' && [...document.images].every((image) => image.complete);

async function settle() {
    // Fonts start loading at layout, so the story is laid out first.
    await nextFrame();
    await nextFrame();
    // It looks again and again rather than waiting for load events: data arriving later adds images, React can
    // replace an image before it loads, and a loaded image can bring in text in another font.
    for (;;) {
        loadLazyImages();
        if (allLoaded()) break;
        await pause(50);
    }
    await nextFrame();
}

export const waitForAssets = (timeoutMs = ASSET_TIMEOUT_MS) =>
    Promise.race([settle(), new Promise<void>((resolve) => setTimeout(resolve, timeoutMs))]);
