import type { ReactNode } from 'react';

import type { InvitationElement } from '@/lib/invitation/elements';
import type { SectionDecoration } from '@/lib/invitation/sections';

// What the editor draws inside the invitation besides its texts: the drag handles
// and the custom section arrows. The renderer leaves a place for each one, so it
// never imports the editor and guests get none of it.
export type CanvasTools = {
    // Inside a spacer, an added image or a photo frame.
    element?: (element: InvitationElement) => ReactNode;
    // Inside a section's decoration.
    decoration?: (sectionId: string, decoration: SectionDecoration) => ReactNode;
    // Under a family section's decoration, or in its place when there is none: which of the
    // theme's elements it shows (an admin's theme editor).
    decorationSlot?: (sectionId: string, decoration: SectionDecoration | undefined) => ReactNode;
    // On the main illustration and the ceremony icon: their size (an admin's theme editor).
    art?: (slot: 'main' | 'ceremonyIcon', scale: number) => ReactNode;
    // Around one item of a custom section.
    customItem?: (sectionId: string, elements: readonly InvitationElement[], item: InvitationElement, content: ReactNode) => ReactNode;
    // Between the columns of a custom section.
    columnBreak?: (sectionId: string, elements: readonly InvitationElement[], breakId: string) => ReactNode;
    // The editor shows every section at its saved height. Guests see it only where it is
    // part of the design (photos and the footer), as on the old published page.
    savedHeights?: boolean;
};
