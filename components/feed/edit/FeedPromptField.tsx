'use client';

import { useTranslations } from 'next-intl';
import { type ChangeEvent, useCallback, useId } from 'react';

import { SettingsInput } from '@/components/saveMyDate/editor/settings/SettingsControls';
import { FEED_PROMPT_MAX_LENGTH } from '@/lib/invitation/sections';

// The photo prompt's line in its sheet, on its own row under the question: the panel is narrow.
export function FeedPromptField({ text, onChange }: { text: string; onChange: (text: string) => void }) {
    const t = useTranslations('FeedSections.prompt');
    const id = useId();
    const change = useCallback((event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value), [onChange]);

    return (
        <div className="flex flex-col gap-1.5">
            <label htmlFor={id} className="text-[13px] leading-tight">
                {t('question')}
            </label>
            <SettingsInput id={id} value={text} maxLength={FEED_PROMPT_MAX_LENGTH} placeholder={t('placeholder')} onChange={change} />
        </div>
    );
}
