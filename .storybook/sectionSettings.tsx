import { produce } from 'immer';
import { useCallback, useMemo, useState } from 'react';

import { storyDraft } from '@/.storybook/editor';
import { SectionSettings } from '@/components/saveMyDate/editor/settings/SectionSettings';
import type { SettingsScope } from '@/hooks/useSectionSettingsPanel';
import { draftImageUploader } from '@/lib/invitation/editorUploads';
import { type DocumentRecipe, settingsGroups } from '@/lib/invitation/sectionSettings';
import { fontOptions } from '@/lib/invitation/textEditing';

export type SectionSettingsStoryArgs = {
    // A section of the sample draft.
    sectionId: string;
    isAdmin: boolean;
    isDocked: boolean;
    onClose: () => void;
};

// The settings of one sample section, with changes kept, as the editor shows them.
function useStoryPanel(sectionId: string, isAdmin: boolean) {
    const [draft] = useState(storyDraft);
    const [document, setDocument] = useState(draft.document);
    const [uploaded, setUploaded] = useState<Record<string, string>>({});
    const edit = useCallback((recipe: DocumentRecipe) => setDocument((current) => produce(current, recipe)), []);
    const addUploaded = useCallback((mediaId: string, url: string) => setUploaded((current) => ({ ...current, [mediaId]: url })), []);
    const media = useCallback((mediaId: string) => uploaded[mediaId] ?? draft.media(mediaId), [draft, uploaded]);
    const fonts = useMemo(() => fontOptions(document, draft.theme), [document, draft.theme]);

    const section = document.sections.find((item) => item.id === sectionId)!;
    const mode = isAdmin ? 'admin' : 'host';
    const scope: SettingsScope = { section, edit, mode, isAdmin, theme: draft.theme, media, fonts, uploadImage: draftImageUploader(draft.id), addUploaded };
    return { scope, groups: settingsGroups(section, mode, draft.theme) };
}

// One section's settings sheet or docked panel over the sample draft.
export function SectionSettingsStory({ sectionId, isAdmin, isDocked, onClose }: SectionSettingsStoryArgs) {
    const panel = useStoryPanel(sectionId, isAdmin);
    return <SectionSettings panel={panel} isDocked={isDocked} onClose={onClose} />;
}
