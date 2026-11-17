'use client';

import { useTranslations } from 'next-intl';

import { SettingsList } from '@/components/saveMyDate/editor/settings/SettingsList';
import { SettingsTextField } from '@/components/saveMyDate/editor/settings/SettingsTextField';
import { useFaqItemsSettings } from '@/hooks/useFaqItemsSettings';
import type { SectionOf, SettingsScope } from '@/hooks/useSectionSettingsPanel';

// The FAQ's questions (old FAQ panel): rows, and one question and its answer at a time.
export function FaqItemsSettings({ scope }: { scope: SettingsScope<SectionOf<'faq'>> }) {
    const t = useTranslations('InvitationEditor.sectionSettings');
    const { list, setQuestion, setAnswer } = useFaqItemsSettings(scope);

    return (
        <SettingsList title={t('questions')} addLabel={t('addQuestion')} list={list}>
            {list.item && (
                <>
                    {/* Question */}
                    <SettingsTextField label={t('question')} value={list.item.question} onSave={setQuestion} />

                    {/* Answer */}
                    <SettingsTextField label={t('answer')} value={list.item.answer} onSave={setAnswer} multiline />
                </>
            )}
        </SettingsList>
    );
}
