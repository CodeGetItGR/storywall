const NON_TYPING_INPUT_TYPES = new Set(['button', 'checkbox', 'color', 'file', 'hidden', 'image', 'radio', 'range', 'reset', 'submit']);

export interface VisualViewportMetrics {
    height: number;
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
    viewport: Pick<VisualViewport, 'height' | 'offsetTop'>,
    typingControlFocused: boolean
): VisualViewportMetrics {
    const height = Math.round(viewport.height);
    const offsetTop = Math.round(viewport.offsetTop);
    const obscuredHeight = Math.max(0, Math.round(layoutHeight - viewport.height - viewport.offsetTop));
    const bottomInset = typingControlFocused && obscuredHeight >= 80 ? obscuredHeight : 0;

    return {
        height,
        offsetTop,
        bottomInset,
        centerY: Math.round(viewport.offsetTop + viewport.height / 2),
    };
}
