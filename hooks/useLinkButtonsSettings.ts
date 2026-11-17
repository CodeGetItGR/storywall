'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useMemo } from 'react';

import type { SettingsScope } from '@/hooks/useSectionSettingsPanel';
import { useSettingsItem } from '@/hooks/useSettingsItem';
import type { InvitationElement } from '@/lib/invitation/elements';
import { setLinkButton } from '@/lib/invitation/sectionSettingsEdits';

type LinkElement = Extract<InvitationElement, { kind: 'link' }>;

// The section's link buttons as rows, and the text and link of the one open.
export function useLinkButtonsSettings({ section, edit }: SettingsScope) {
    const t = useTranslations('InvitationEditor.sectionSettings');
    const buttons = useMemo(() => section.elements.filter((element): element is LinkElement => element.kind === 'link'), [section.elements]);
    const { item, open, close } = useSettingsItem(buttons);
    const itemId = item?.id;

    const setText = useCallback((text: string) => itemId && edit(setLinkButton(section.id, itemId, { text })), [edit, itemId, section.id]);
    const setUrl = useCallback((url: string) => itemId && edit(setLinkButton(section.id, itemId, { url })), [edit, itemId, section.id]);

    const rows = buttons.map((button) => ({ id: button.id, label: button.text.trim() || t('buttonText'), detail: undefined }));

    return { rows, item, open, close, setText, setUrl };
}
