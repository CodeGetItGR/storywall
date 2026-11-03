'use client';

import { useTranslations } from 'next-intl';

import { adminInputClass } from '@/components/admin/AdminField';
import type { QrCardLayoutEditorState } from '@/hooks/useQrCardLayoutEditor';
import { useQrCardStandardWording } from '@/hooks/useQrCardStandardWording';
import { QR_CARD_WORDING_KEYS } from '@/lib/qrCardLayout';

const LANGUAGES = ['en', 'el'] as const;
// The backend's cap on one line's wording.
const WORDING_MAX = 60;

// The design's line under the code for each thing a code opens, in English and Greek. The standard line
// shows as the placeholder, and an empty input prints it.
export function QrCardLineWordingPanel({ editor }: { editor: QrCardLayoutEditorState }) {
    const t = useTranslations('AdminPage.qrCards.layout');
    const standard = useQrCardStandardWording();
    const text = editor.layout.lines.text;

    return (
        <fieldset className="space-y-3">
            {/* Heading */}
            <legend className="text-[11px] font-bold tracking-wide text-ink-muted uppercase">{t('wording.legend')}</legend>
            <p className="text-[11px] leading-4 text-ink-faint">{t('wording.hint')}</p>

            {/* Lines */}
            {QR_CARD_WORDING_KEYS.map((key) => (
                <div key={key} className="space-y-1">
                    <p className="text-xs font-semibold text-ink">{t(`wording.keys.${key}`)}</p>
                    {LANGUAGES.map((language) => (
                        <div key={language} className="flex items-center gap-2">
                            <span aria-hidden="true" className="w-5 shrink-0 font-mono text-[10px] text-ink-faint uppercase">
                                {t(`wording.short.${language}`)}
                            </span>
                            <input
                                name={`${key}.${language}`}
                                value={text?.[key]?.[language] ?? ''}
                                placeholder={standard[language][key]}
                                onChange={editor.handleWordingChange}
                                maxLength={WORDING_MAX}
                                aria-label={t(`wording.input.${language}`, { line: t(`wording.keys.${key}`) })}
                                className={adminInputClass('min-h-9 py-1.5 text-xs')}
                            />
                        </div>
                    ))}
                </div>
            ))}
        </fieldset>
    );
}
