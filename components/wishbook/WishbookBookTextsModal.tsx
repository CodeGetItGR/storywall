'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ChangeEvent, type SubmitEvent, useId, useState } from 'react';

import { Modal } from '@/components/ui/modal';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useSaveWishbookBookTexts, useWishbookBookTexts } from '@/hooks/useWishbookBook';
import {
    WISHBOOK_BOOK_TEXT_LIMITS,
    WISHBOOK_BOOK_TEXT_MAX_LINES,
    type WishbookBookTextsDto,
    type WishbookBookTextsRequestDto,
} from '@/lib/api/types';
import { cn } from '@/lib/utils';

type Field = keyof WishbookBookTextsRequestDto;
const FIELDS: { name: Field; multiline: boolean }[] = [
    { name: 'subtitle', multiline: false },
    { name: 'dedication', multiline: true },
    { name: 'closingTitle', multiline: false },
    { name: 'closingBody', multiline: true },
];
const inputClass =
    'w-full rounded-2xl border border-border/70 bg-background px-4 py-2.5 text-sm text-ink outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/20';

// A line the server treats as blank: only whitespace, control or invisible characters.
const BLANK_LINE = /^[\s\p{Cc}\p{Cf}]*$/u;

// What the server will count, mirroring WishbookBookTextService (the BE worktree): spaces collapsed and every line trimmed;
// in the multiline fields, leading and trailing blank lines dropped and a run of blank lines kept as one, and the lines
// that remain (separators included) counted, with the length taken from those lines joined by "\n". Invisible characters
// are not stripped here as the server does, so the length is never below the server's: at worst Save is blocked a few
// characters early, never allowed too late. JavaScript string length is in UTF-16 units, like Java's.
function measure(value: string, multiline: boolean): { length: number; lines: number } {
    if (!multiline) {
        const text = value.replace(/\s+/g, ' ').trim();
        return { length: text.length, lines: text ? 1 : 0 };
    }
    const kept: string[] = [];
    for (const raw of value.split(/\r\n|\r|\n/)) {
        const blank = BLANK_LINE.test(raw);
        if (blank && (kept.length === 0 || kept[kept.length - 1] === '')) continue;
        kept.push(blank ? '' : raw.replace(/\s+/g, ' ').trim());
    }
    while (kept.length > 0 && kept[kept.length - 1] === '') kept.pop();
    return { length: kept.join('\n').length, lines: kept.length };
}

function toDraft(texts: WishbookBookTextsDto): Record<Field, string> {
    return {
        subtitle: texts.subtitle ?? '',
        dedication: texts.dedication ?? '',
        closingTitle: texts.closingTitle ?? '',
        closingBody: texts.closingBody ?? '',
    };
}

export function WishbookBookTextsModal({ eventId, onCloseAction }: { eventId: string; onCloseAction: () => void }) {
    const t = useTranslations('WishbookPage.bookTexts');
    const toErrorMessage = useApiErrorMessage();
    const texts = useWishbookBookTexts(eventId, true);
    return (
        <Modal open onClose={onCloseAction} size="sm" ariaLabel={t('title')} closeLabel={t('cancel')}>
            {texts.data ? (
                <TextsForm eventId={eventId} texts={texts.data} onCloseAction={onCloseAction} />
            ) : texts.isError ? (
                <p role="alert" className="p-6 text-sm text-rose-600">
                    {toErrorMessage(texts.error)}
                </p>
            ) : (
                <div className="flex justify-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin text-ink-faint" aria-hidden="true" />
                </div>
            )}
        </Modal>
    );
}

function TextsForm({ eventId, texts, onCloseAction }: { eventId: string; texts: WishbookBookTextsDto; onCloseAction: () => void }) {
    const t = useTranslations('WishbookPage.bookTexts');
    const toErrorMessage = useApiErrorMessage();
    const save = useSaveWishbookBookTexts(eventId);
    const [draft, setDraft] = useState(() => toDraft(texts));
    const idBase = useId();
    // The counters are soft: the typed text is never cut. A field over a limit is flagged and Save waits for it.
    const measured = FIELDS.map(({ name, multiline }) => {
        const { length, lines } = measure(draft[name], multiline);
        return {
            name,
            multiline,
            length,
            overLength: length > WISHBOOK_BOOK_TEXT_LIMITS[name],
            overLines: multiline && lines > WISHBOOK_BOOK_TEXT_MAX_LINES,
        };
    });
    const hasOverflow = measured.some((field) => field.overLength || field.overLines);

    function change(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
        const name = event.currentTarget.name as Field;
        const value = event.currentTarget.value;
        setDraft((current) => ({ ...current, [name]: value }));
    }
    async function submit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (hasOverflow) return;
        // The PUT replaces all four fields: a blank one resets to its default.
        const input: WishbookBookTextsRequestDto = {
            subtitle: draft.subtitle.trim() || null,
            dedication: draft.dedication.trim() || null,
            closingTitle: draft.closingTitle.trim() || null,
            closingBody: draft.closingBody.trim() || null,
        };
        try {
            await save.mutateAsync(input);
        } catch {
            return; // save.error shows below; keep the form open so nothing typed is lost
        }
        onCloseAction();
    }

    return (
        <form onSubmit={submit} className="space-y-4 p-6">
            <div>
                <h2 className="text-base font-semibold text-ink">{t('title')}</h2>
                <p className="mt-1 text-xs text-ink-muted">{t('hint')}</p>
            </div>
            {measured.map(({ name, multiline, length, overLength, overLines }) => {
                const inputId = `${idBase}-${name}`;
                const counterId = `${inputId}-counter`;
                const hintId = `${inputId}-hint`;
                const describedBy = overLines ? `${counterId} ${hintId}` : counterId;
                const over = overLength || overLines;
                return (
                    <div key={name} className="space-y-1.5">
                        <div className="flex items-baseline justify-between gap-2 text-xs">
                            <label htmlFor={inputId} className="font-semibold text-ink">
                                {t(name)}
                            </label>
                            <span id={counterId} className={cn('shrink-0', over ? 'font-semibold text-rose-600' : 'text-ink-faint')}>
                                {t('counter', { current: length, max: WISHBOOK_BOOK_TEXT_LIMITS[name] })}
                            </span>
                        </div>
                        {multiline ? (
                            <textarea
                                id={inputId}
                                name={name}
                                rows={WISHBOOK_BOOK_TEXT_MAX_LINES}
                                value={draft[name]}
                                onChange={change}
                                placeholder={texts.defaults[name]}
                                aria-describedby={describedBy}
                                aria-invalid={over}
                                className={`${inputClass} resize-none`}
                            />
                        ) : (
                            <input
                                id={inputId}
                                name={name}
                                value={draft[name]}
                                onChange={change}
                                placeholder={texts.defaults[name]}
                                aria-describedby={describedBy}
                                aria-invalid={over}
                                className={inputClass}
                            />
                        )}
                        {overLines && (
                            <p id={hintId} className="text-xs text-rose-600">
                                {t('tooManyLines', { max: WISHBOOK_BOOK_TEXT_MAX_LINES })}
                            </p>
                        )}
                    </div>
                );
            })}
            {save.error && (
                <p role="alert" className="text-xs text-rose-600">
                    {toErrorMessage(save.error)}
                </p>
            )}
            <div className="flex justify-end gap-2">
                <button type="button" onClick={onCloseAction} className="h-10 rounded-full px-4 text-sm font-semibold text-ink-muted">
                    {t('cancel')}
                </button>
                <button
                    type="submit"
                    disabled={save.isPending || hasOverflow}
                    className="inline-flex h-10 items-center gap-2 rounded-full px-5 text-sm font-semibold text-white bg-gradient-brand disabled:opacity-60"
                >
                    {save.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                    {t('save')}
                </button>
            </div>
        </form>
    );
}
