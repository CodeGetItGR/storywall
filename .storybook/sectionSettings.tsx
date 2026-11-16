import { produce } from 'immer';
import { useCallback, useMemo, useState } from 'react';

import { storyDraft } from '@/.storybook/editor';
import { SectionSettings } from '@/components/saveMyDate/editor/settings/SectionSettings';
import type { SettingsScope } from '@/hooks/useSectionSettingsPanel';
import { eventFieldLinks } from '@/lib/invitation/eventData';
import { type InvitationEventData, syncWithEvent } from '@/lib/invitation/eventLinks';
import { type DocumentRecipe, settingsGroups } from '@/lib/invitation/sectionSettings';
import { fontOptions } from '@/lib/invitation/textEditing';

// The wedding the sample draft is on in the stories that show what the event fills (KAN-84).
export const STORY_INVITATION_EVENT: InvitationEventData = {
    eventType: 'WEDDING',
    title: 'Μαρία & Γιάννης',
    timezone: 'Europe/Athens',
    startAt: '2027-06-12T15:00:00Z',
    rsvp: { deadline: '2027-05-01T21:00:00Z' },
    cover: null,
    location: { name: 'Άγιος Νικόλαος', address: 'Πλάκα, Αθήνα', mapsUrl: 'https://maps.google.com/?q=agios' },
    sessions: [
        {
            id: 'ses-church',
            title: 'Μυστήριο',
            description: null,
            startAt: '2027-06-12T15:00:00Z',
            locationName: 'Άγιος Νικόλαος',
            locationAddress: 'Πλάκα, Αθήνα',
            mapsUrl: 'https://maps.google.com/?q=agios',
            displayOrder: 0,
            isMain: true,
            isSecondary: false,
        },
        {
            id: 'ses-party',
            title: 'Δεξίωση',
            description: 'Στον κήπο',
            startAt: '2027-06-12T18:00:00Z',
            locationName: 'Κτήμα Λεμονιά',
            locationAddress: 'Βάρκιζα',
            mapsUrl: 'https://maps.google.com/?q=lemonia',
            displayOrder: 1,
            isMain: false,
            isSecondary: true,
        },
    ],
    joinUrl: null,
};

export type SectionSettingsStoryArgs = {
    // A section of the sample draft.
    sectionId: string;
    isAdmin: boolean;
    isDocked: boolean;
    // The cover follows its event (KAN-84), so the sheet starts with the "Follow the event" switch.
    followsEvent?: boolean;
    // The draft is on STORY_INVITATION_EVENT, which fills its names, date, deadline, schedule and places.
    onEvent?: boolean;
    onClose: () => void;
};

type StoryPanelOptions = { followsEvent?: boolean; onEvent?: boolean };

// The settings of one sample section, with changes kept, as the editor shows them.
export function useStoryPanel(sectionId: string, isAdmin: boolean, { followsEvent = false, onEvent = false }: StoryPanelOptions = {}) {
    const [draft] = useState(storyDraft);
    const event = onEvent ? STORY_INVITATION_EVENT : null;
    const [document, setDocument] = useState(() =>
        produce(draft.document, (next) => {
            if (followsEvent) {
                const target = next.sections.find((item) => item.id === sectionId);
                if (target?.type === 'photo') target.link = { source: 'event', enabled: true };
            }
            if (event) syncWithEvent(event, null)(next);
        }),
    );
    const [uploaded, setUploaded] = useState<Record<string, string>>({});
    const edit = useCallback((recipe: DocumentRecipe) => setDocument((current) => produce(current, recipe)), []);
    const addUploaded = useCallback((mediaId: string, url: string) => setUploaded((current) => ({ ...current, [mediaId]: url })), []);
    const media = useCallback((mediaId: string) => uploaded[mediaId] ?? draft.media(mediaId), [draft, uploaded]);
    const fonts = useMemo(() => fontOptions(document, draft.theme), [document, draft.theme]);

    const section = document.sections.find((item) => item.id === sectionId)!;
    const mode = isAdmin ? 'admin' : 'host';
    const scope: SettingsScope = {
        section,
        edit,
        mode,
        isAdmin,
        theme: draft.theme,
        media,
        fonts,
        draftId: draft.id,
        addUploaded,
        event,
        eventSamples: null,
        eventFieldLinks: event ? eventFieldLinks('evt-wedding') : null,
    };
    return { scope, groups: settingsGroups(section, mode, draft.theme) };
}

// One section's settings sheet or docked panel over the sample draft.
export function SectionSettingsStory({ sectionId, isAdmin, isDocked, followsEvent, onEvent, onClose }: SectionSettingsStoryArgs) {
    const panel = useStoryPanel(sectionId, isAdmin, { followsEvent, onEvent });
    return <SectionSettings panel={panel} isDocked={isDocked} onClose={onClose} />;
}
