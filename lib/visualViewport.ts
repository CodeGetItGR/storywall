const NON_TYPING_INPUT_TYPES = new Set(['button', 'checkbox', 'color', 'file', 'hidden', 'image', 'radio', 'range', 'reset', 'submit']);

export interface VisualViewportMetrics {
    height: number;
    // The visible height at the page's unzoomed size: shrinks for the keyboard, not for a pinch zoom.
    pageHeight: number;
    offsetTop: number;
    bottomInset: number;
    centerY: number;
}

export function isTypingControl(element: Element | null): element is HTMLElement {
    if (!(element instanceof HTMLElement) || element.getAttribute('inputmode') === 'none') return false;
    if (element instanceof HTMLTextAreaElement || element.isContentEditable) return true;
    return element instanceof HTMLInputElement && !NON_TYPING_INPUT_TYPES.has(element.type);
}

export function getVisualViewportMetrics(
    layoutHeight: number,
    viewport: Pick<VisualViewport, 'height' | 'offsetTop' | 'scale'>,
    typingControlFocused: boolean,
): VisualViewportMetrics {
    const height = Math.round(viewport.height);
    const pageHeight = Math.round(viewport.height * viewport.scale);
    const offsetTop = Math.round(viewport.offsetTop);
    const obscuredHeight = Math.max(0, Math.round(layoutHeight - viewport.height - viewport.offsetTop));
    const bottomInset = typingControlFocused && obscuredHeight >= 80 ? obscuredHeight : 0;

    return {
        height,
        pageHeight,
        offsetTop,
        bottomInset,
        centerY: Math.round(viewport.offsetTop + viewport.height / 2),
    };
}

// Below this the page counts as unzoomed; browsers report 1 with float noise.
const PINCH_ZOOM_MIN_SCALE = 1.01;

// Fixed elements are laid out against the layout viewport, so a pinch zoom
// magnifies them with the page. This box covers the visible part of the page
// at its unzoomed screen size: pin chrome to its edges to keep it full size.
// Null when the page isn't pinch-zoomed.
export function getPinchZoomBox(
    viewport: Pick<VisualViewport, 'scale' | 'width' | 'height' | 'offsetLeft' | 'offsetTop'>,
): { width: number; height: number; transform: string } | null {
    if (viewport.scale < PINCH_ZOOM_MIN_SCALE) return null;

    return {
        width: viewport.width * viewport.scale,
        height: viewport.height * viewport.scale,
        transform: `translate(${viewport.offsetLeft}px, ${viewport.offsetTop}px) scale(${1 / viewport.scale})`,
    };
}
