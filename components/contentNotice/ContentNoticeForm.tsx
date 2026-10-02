'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ChangeEvent, FormEvent } from 'react';

import type { ContentNoticeFieldKey } from '@/hooks/useContentNoticeSubmit';
import { NOTICE_LIMITS, useContentNoticeSubmit } from '@/hooks/useContentNoticeSubmit';
import type { NoticeCategory } from '@/lib/api/types';
import { NOTICE_CATEGORIES } from '@/lib/api/types';
import { cn } from '@/lib/utils';

type TextFieldKey = 'locationText' | 'link' | 'explanation' | 'notifierName' | 'notifierEmail' | 'website';

const INPUT =
    'w-full rounded-xl border border-border/70 bg-background px-4 py-3 text-sm text-ink transition outline-none placeholder:text-ink-faint focus:border-primary/40 focus:ring-4 focus:ring-primary/10 aria-[invalid=true]:border-red-500';
const LABEL = 'mb-1.5 block text-sm font-medium text-ink';
const HINT = 'mt-1.5 text-xs text-ink-muted';
const FIELD_ERROR = 'mt-1.5 text-xs text-red-600';

// Public (no login), so the form talks to the API without credentials; see useContentNoticeSubmit.
export function ContentNoticeForm() {
    const t = useTranslations('ContentNoticeForm');
    const notice = useContentNoticeSubmit();
    const { draft, fieldErrors, setField } = notice;
    const identityOptional = draft.category === 'CHILD_SEXUAL_ABUSE';

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        void notice.submit();
    }

    function handleText(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
        setField(event.target.name as TextFieldKey, event.target.value);
    }

    function handleCategory(event: ChangeEvent<HTMLInputElement>) {
        setField('category', event.target.value as NoticeCategory);
    }

    function handleGoodFaith(event: ChangeEvent<HTMLInputElement>) {
        setField('goodFaith', event.target.checked);
    }

    if (notice.reference) {
        return (
            <div className="flex flex-col gap-2">
                <p role="status" className="text-base font-semibold text-ink">
                    {t('sent', { reference: notice.reference })}
                </p>
                <p className="text-sm text-ink-muted">{t('sentNext')}</p>
            </div>
        );
    }

    const fieldError = (key: ContentNoticeFieldKey) =>
        fieldErrors[key] ? (
            <p id={`cn-${key}-error`} className={FIELD_ERROR}>
                {fieldErrors[key]}
            </p>
        ) : null;
    const invalid = (key: ContentNoticeFieldKey) => (fieldErrors[key] ? { 'aria-invalid': true, 'aria-describedby': `cn-${key}-error` } : {});

    return (
        <form
            onSubmit={handleSubmit}
            className="relative flex flex-col gap-6"
        >
            {/* Category */}
            <fieldset className="flex flex-col gap-2">
                <legend className={LABEL}>{t('fields.category')}</legend>
                {NOTICE_CATEGORIES.map((category) => (
                    <label key={category} className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-ink">
                        <input
                            type="radio"
                            name="category"
                            value={category}
                            required
                            checked={draft.category === category}
                            onChange={handleCategory}
                            className="size-4 accent-primary"
                        />
                        {t(`categories.${category}`)}
                    </label>
                ))}
                {fieldError('category')}
            </fieldset>

            {/* Where it is */}
            <div>
                <label htmlFor="cn-location" className={LABEL}>
                    {t('fields.location')}
                </label>
                <textarea
                    id="cn-location"
                name="locationText"
                    required
                    minLength={NOTICE_LIMITS.location[0]}
                    maxLength={NOTICE_LIMITS.location[1]}
                    rows={3}
                    value={draft.locationText}
                    onChange={handleText}
                    className={INPUT}
                    {...invalid('locationText')}
                />
                <p className={HINT}>{t('help.location')}</p>
                {fieldError('locationText')}
            </div>

            {/* Link */}
            <div>
                <label htmlFor="cn-link" className={LABEL}>
                    {t('fields.link')}
                </label>
                <input
                    id="cn-link"
                name="link"
                    type="url"
                    maxLength={NOTICE_LIMITS.link}
                    value={draft.link}
                    onChange={handleText}
                    className={INPUT}
                    {...invalid('link')}
                />
                {fieldError('link')}
            </div>

            {/* Explanation */}
            <div>
                <label htmlFor="cn-explanation" className={LABEL}>
                    {t('fields.explanation')}
                </label>
                <textarea
                    id="cn-explanation"
                name="explanation"
                    required
                    minLength={NOTICE_LIMITS.explanation[0]}
                    maxLength={NOTICE_LIMITS.explanation[1]}
                    rows={6}
                    value={draft.explanation}
                    onChange={handleText}
                    className={INPUT}
                    {...invalid('explanation')}
                />
                {fieldError('explanation')}
            </div>

            {/* Name and email */}
            <div className="flex flex-col gap-4">
                {identityOptional && <p className="text-sm text-ink-muted">{t('identityOptional')}</p>}
                <div>
                    <label htmlFor="cn-name" className={LABEL}>
                        {t('fields.name')}
                    </label>
                    <input
                        id="cn-name"
                    name="notifierName"
                        autoComplete="name"
                        maxLength={NOTICE_LIMITS.name}
                        required={!identityOptional}
                        value={draft.notifierName}
                        onChange={handleText}
                        className={INPUT}
                        {...invalid('notifierName')}
                    />
                    {fieldError('notifierName')}
                </div>
                <div>
                    <label htmlFor="cn-email" className={LABEL}>
                        {t('fields.email')}
                    </label>
                    <input
                        id="cn-email"
                    name="notifierEmail"
                        type="email"
                        autoComplete="email"
                        maxLength={NOTICE_LIMITS.email}
                        required={!identityOptional}
                        value={draft.notifierEmail}
                        onChange={handleText}
                        className={INPUT}
                        {...invalid('notifierEmail')}
                    />
                    {fieldError('notifierEmail')}
                </div>
            </div>

            {/* Good faith */}
            <div>
                <label className="flex cursor-pointer items-start gap-3 text-sm text-ink">
                    <input
                        type="checkbox"
                        required
                        checked={draft.goodFaith}
                        onChange={handleGoodFaith}
                        className="mt-0.5 size-4 shrink-0 accent-primary"
                        {...invalid('goodFaith')}
                    />
                    {t('fields.goodFaith')}
                </label>
                {fieldError('goodFaith')}
            </div>

            {/* Honeypot: off-screen rather than display:none, which some bots skip. */}
            <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
                <label>
                    Website
                    <input
                        name="website"
                        tabIndex={-1}
                        autoComplete="off"
                        value={draft.website}
                        onChange={handleText}
                    />
                </label>
            </div>

            {/* Submit */}
            <div className="flex flex-col gap-3">
                <button
                    type="submit"
                    disabled={!notice.canSubmit || notice.isSubmitting}
                    className={cn(
                        'bg-gradient-brand inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-full px-6 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60',
                    )}
                >
                    {notice.isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                    {t('submit')}
                </button>
                {notice.error && (
                    <p role="alert" className="text-sm text-red-600">
                        {t(`errors.${notice.error}`)}
                    </p>
                )}
            </div>
        </form>
    );
}
