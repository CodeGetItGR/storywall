'use client';

import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { useListSettings } from '@/hooks/useListSettings';
import type { SectionOf, SettingsScope } from '@/hooks/useSectionSettingsPanel';
import type { ListItem } from '@/lib/invitation/listEdits';

// The FAQ's questions: rows by question, and the question and answer of the one open.
export function useFaqItemsSettings(scope: SettingsScope<SectionOf<'faq'>>) {
    const t = useTranslations('InvitationEditor.sectionSettings');
    const labelOf = useCallback((item: ListItem<'faq'>) => item.question.trim() || t('untitled'), [t]);
    const list = useListSettings(scope, 'faq', labelOf);

    return { list, setQuestion: list.fieldSaver('question'), setAnswer: list.fieldSaver('answer') };
}
