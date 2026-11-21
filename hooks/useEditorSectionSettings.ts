'use client';

import { useCallback, useMemo } from 'react';

import { useEditorMode } from '@/hooks/useEditorMode';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useSectionSettings } from '@/hooks/useSectionSettings';
import { useSectionSettingsPanel } from '@/hooks/useSectionSettingsPanel';
import { useUploadedMedia } from '@/hooks/useUploadedMedia';
import type { InvitationDocument } from '@/lib/invitation/document';
import type { InvitationEditorStore } from '@/lib/invitation/editorStore';
import type { ImageUploader } from '@/lib/invitation/editorUploads';
import type { EventFieldLinks } from '@/lib/invitation/eventData';
import type { InvitationEventData, SampleSections } from '@/lib/invitation/eventLinks';
import type { MediaResolver } from '@/lib/invitation/render';
import type { ThemeDesign } from '@/lib/invitation/theme';
import type { InvitationFontDto } from '@/lib/invitation/uploadedFonts';

// Where the side panels dock beside the canvas (EditorDockedPanel).
export const DOCKED_PANELS_QUERY = '(min-width: 1101px)';

// What the open draft or theme gives the settings: its look, its images (a draft's with its
// event's on top) and where new ones go.
export type SectionSettingsSource = { theme: ThemeDesign; media: MediaResolver; uploadImage: ImageUploader };

// What the invitation follows from its event (useInvitationEventSync). A theme, or a draft on no event, has none.
export type SectionSettingsEvents = { event: InvitationEventData | null; samples?: SampleSections | null; fieldLinks?: EventFieldLinks | null };

const NO_EVENT: SectionSettingsEvents = { event: null };

// The section settings sheet of the editor: which section is open, the images
// uploaded meanwhile, and whether it docks beside the canvas.
export function useEditorSectionSettings(
    store: InvitationEditorStore,
    document: InvitationDocument,
    source: SectionSettingsSource,
    activate: (id: string) => void,
    uploadedFonts?: InvitationFontDto[],
    events: SectionSettingsEvents = NO_EVENT,
) {
    const mode = useEditorMode();
    const uploads = useUploadedMedia(source.media);
    const settings = useSectionSettings(store, document, source.theme, mode);
    const isDocked = useMediaQuery(DOCKED_PANELS_QUERY);
    const panel = useSectionSettingsPanel(settings, {
        document,
        theme: source.theme,
        media: uploads.media,
        uploadedFonts,
        uploadImage: source.uploadImage,
        addUploaded: uploads.addUploaded,
        event: events.event,
        eventSamples: events.samples ?? null,
        eventFieldLinks: events.fieldLinks ?? null,
    });

    const { open: openSettings, hasSettings, close } = settings;
    const open = useCallback(
        (id: string) => {
            activate(id);
            openSettings(id);
        },
        [activate, openSettings],
    );
    const opener = useMemo(() => ({ hasSettings, open }), [hasSettings, open]);

    return { media: uploads.media, addUploaded: uploads.addUploaded, panel, opener, close, isDocked };
}
