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
    // Around one item of a custom section.
    customItem?: (sectionId: string, elements: readonly InvitationElement[], item: InvitationElement, content: ReactNode) => ReactNode;
    // Between the columns of a custom section.
    columnBreak?: (sectionId: string, elements: readonly InvitationElement[], breakId: string) => ReactNode;
    // The editor shows every section at its saved height. Guests see it only where it is
    // part of the design (photos and the footer), as on the old published page.
    savedHeights?: boolean;
};
