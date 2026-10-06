'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ChangeEvent, type SubmitEvent, useState } from 'react';

import { Modal } from '@/components/ui/modal';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useSaveWishbookBookTexts, useWishbookBookTexts } from '@/hooks/useWishbookBook';
import {
    WISHBOOK_BOOK_TEXT_LIMITS,
    WISHBOOK_BOOK_TEXT_MAX_LINES,
    type WishbookBookTextsDto,
    type WishbookBookTextsRequestDto,
} from '@/lib/api/types';

type Field = keyof WishbookBookTextsRequestDto;
const FIELDS: { name: Field; multiline: boolean }[] = [
    { name: 'subtitle', multiline: false },
    { name: 'dedication', multiline: true },
    { name: 'closingTitle', multiline: false },
    { name: 'closingBody', multiline: true },
];
const inputClass =
    'w-full rounded-2xl border border-border/70 bg-background px-4 py-2.5 text-sm text-ink outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/20';

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
    const texts = useWishbookBookTexts(eventId, true);
    return (
        <Modal open onClose={onCloseAction} size="sm" ariaLabel={t('title')} closeLabel={t('cancel')}>
            {texts.data ? (
                <TextsForm eventId={eventId} texts={texts.data} onCloseAction={onCloseAction} />
            ) : (
                <div className="flex justify-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin text-ink-faint" />
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

    function change(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
        const name = event.currentTarget.name as Field;
        let value = event.currentTarget.value.slice(0, WISHBOOK_BOOK_TEXT_LIMITS[name]);
        // Line breaks are kept by the BE in the multiline fields, up to 6 lines; drop any extra lines here.
        if (FIELDS.find((field) => field.name === name)?.multiline) {
            value = value.split('\n').slice(0, WISHBOOK_BOOK_TEXT_MAX_LINES).join('\n');
        }
        setDraft((current) => ({ ...current, [name]: value }));
    }
    async function submit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
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
            {FIELDS.map(({ name, multiline }) => (
                <label key={name} className="block space-y-1.5">
                    <span className="flex justify-between text-xs font-semibold text-ink">
                        {t(name)}
                        <span className="font-normal text-ink-faint">
                            {t('counter', { current: draft[name].length, max: WISHBOOK_BOOK_TEXT_LIMITS[name] })}
                        </span>
                    </span>
                    {multiline ? (
                        <textarea
                            name={name}
                            rows={4}
                            value={draft[name]}
                            onChange={change}
                            placeholder={texts.defaults[name]}
                            className={`${inputClass} resize-none`}
                        />
                    ) : (
                        <input name={name} value={draft[name]} onChange={change} placeholder={texts.defaults[name]} className={inputClass} />
                    )}
                </label>
            ))}
            {save.error && <p className="text-xs text-rose-600">{toErrorMessage(save.error)}</p>}
            <div className="flex justify-end gap-2">
                <button type="button" onClick={onCloseAction} className="h-10 rounded-full px-4 text-sm font-semibold text-ink-muted">
                    {t('cancel')}
                </button>
                <button
                    type="submit"
                    disabled={save.isPending}
                    className="inline-flex h-10 items-center gap-2 rounded-full px-5 text-sm font-semibold text-white bg-gradient-brand disabled:opacity-60"
                >
                    {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    {t('save')}
                </button>
            </div>
        </form>
    );
}
