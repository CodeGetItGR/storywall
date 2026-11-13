import type { ReactNode } from 'react';

import type { InvitationElement } from '@/lib/invitation/elements';
import type { PhotoFrameElement } from '@/lib/invitation/photoFrame';
import type { PhotoSlot } from '@/lib/invitation/photoSlots';
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
    // On a photo the host can add or replace. An empty slot is drawn only when this is set.
    photo?: (slot: PhotoSlot, hasPhoto: boolean) => ReactNode;
    // Over a framed photo: move and zoom it.
    framePhoto?: (element: PhotoFrameElement) => ReactNode;
    // Admins: which frame and its effect. When set, a frame with no art yet shows as an empty box.
    frameSettings?: (element: PhotoFrameElement) => ReactNode;
    // Over the photo band's photo: move it up and down.
    photoBand?: (sectionId: string, imageY: number) => ReactNode;
    // Between the columns of a custom section.
    columnBreak?: (sectionId: string, elements: readonly InvitationElement[], breakId: string) => ReactNode;
    // The editor shows every section at its saved height. Guests see it only where it is
    // part of the design (photos and the footer), as on the old published page.
    savedHeights?: boolean;
};
