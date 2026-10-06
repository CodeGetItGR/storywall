import type { EventThemeFontDto } from '@/lib/api/types';
import { themeFontFaceCss } from '@/lib/eventTheme';

// Declares a theme's heading font. The CSS is built only from validated key/url patterns
// (themeFontFaceCss), so it is safe to inline.
export function ThemeFontFace({ font }: { font: EventThemeFontDto | null | undefined }) {
    const css = themeFontFaceCss(font);
    return css ? <style>{css}</style> : null;
}
