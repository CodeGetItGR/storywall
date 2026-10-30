'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { adminInputClass } from '@/components/admin/AdminField';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useOutreachFormat } from '@/hooks/useOutreachFormat';
import { useOutreachNotes } from '@/hooks/useOutreachNotes';
import { OUTREACH_NOTE_MAX } from '@/lib/adminOutreach';
import type { OutreachProspectDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

export function OutreachNotes({ prospect }: { prospect: OutreachProspectDto }) {
    const t = useTranslations('AdminPage.outreach.notes');
    const format = useOutreachFormat();
    const notes = useOutreachNotes(prospect.id);
    const toErrorMessage = useApiErrorMessage();
    const inputId = `outreach-note-${prospect.id}`;

    return (
        <section className="space-y-3">
            {/* Title */}
            <h3 className="text-sm font-bold text-ink">{t('title')}</h3>

            {/* Add */}
            <form onSubmit={notes.handleSubmit} className="space-y-2">
                <label htmlFor={inputId} className="sr-only">
                    {t('add')}
                </label>
                <textarea
                    id={inputId}
                    value={notes.body}
                    onChange={notes.handleBodyChange}
                    rows={2}
                    maxLength={OUTREACH_NOTE_MAX}
                    placeholder={t('placeholder')}
                    className={adminInputClass('resize-y')}
                />
                {Boolean(notes.error) && (
                    <p role="alert" className="text-sm text-status-danger">
                        {toErrorMessage(notes.error)}
                    </p>
                )}
                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={!notes.canSubmit}
                        className="inline-flex h-9 items-center gap-2 rounded-md bg-ink px-4 text-sm font-bold text-white disabled:opacity-40"
                    >
                        {notes.isSaving && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
                        {t('add')}
                    </button>
                </div>
            </form>

            {/* Activity */}
            {prospect.notes.length === 0 && <p className="text-sm text-ink-muted">{t('empty')}</p>}
            {prospect.notes.length > 0 && (
                <ol className="space-y-3 border-l-2 border-border pl-3">
                    {prospect.notes.map((note) => (
                        <li key={note.id}>
                            <p className={cn('text-sm leading-6 whitespace-pre-wrap', note.kind === 'NOTE' ? 'text-ink' : 'text-ink-muted italic')}>
                                {note.body}
                            </p>
                            <p className="text-xs text-ink-faint">
                                {note.authorName
                                    ? t('byline', { author: note.authorName, date: format.dateTime(note.createdAt) })
                                    : format.dateTime(note.createdAt)}
                            </p>
                        </li>
                    ))}
                </ol>
            )}
        </section>
    );
}
