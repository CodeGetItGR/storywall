import { contrastRatio, MIN_INK_CONTRAST } from '@/lib/contrast';
import { colorInputValue } from '@/lib/invitation/colorInput';
import { readableTextOn } from '@/lib/pageTone';

// A button's text when neither the theme nor the host picked one. invitation.css falls back to the same colour.
export const DEFAULT_BUTTON_TEXT = '#24332f';

// The default text where it reads on the button, else the app's readable text. A see-through button keeps the
// default: what shows behind it isn't known here.
export function buttonTextOn(background: string | undefined): string {
    const opaque = background && /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(background) ? colorInputValue(background) : undefined;
    if (!opaque || contrastRatio(DEFAULT_BUTTON_TEXT, opaque) >= MIN_INK_CONTRAST) return DEFAULT_BUTTON_TEXT;
    return readableTextOn(opaque);
}
