'use client';

import { createContext, type ReactNode, useContext } from 'react';

export type ColorSurface = 'dark' | 'light';

const ColorSurfaceContext = createContext<ColorSurface>('dark');

// Tells the colour popovers inside which surface they open from: the same settings draw in the editor's dark dock and
// in its light phone sheet, and a popover is portalled out of both.
export function ColorSurfaceProvider({ surface, children }: { surface: ColorSurface; children: ReactNode }) {
    return <ColorSurfaceContext.Provider value={surface}>{children}</ColorSurfaceContext.Provider>;
}

// The colour's own surface, or the one it is drawn on.
export function useColorSurface(own?: ColorSurface): ColorSurface {
    const around = useContext(ColorSurfaceContext);
    return own ?? around;
}
