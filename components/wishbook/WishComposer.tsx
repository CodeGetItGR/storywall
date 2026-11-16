'use client';

import { BookHeart, Loader2, Send } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { VoiceRecorder } from '@/components/wishbook/VoiceRecorder';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import type { WishComposerState } from '@/hooks/useWishComposer';

type Props = {
    composer: WishComposerState;
    maxMessageLength: number;
};

// The in-app write form: a written wish, a recorded one, or both.
export function WishComposer({ composer, maxMessageLength }: Props) {
    const t = useTranslations('WishbookPage');
    const toErrorMessage = useApiErrorMessage();

    if (composer.showSent) {
        return (
            /* Sent */
            <div className="mt-8 flex flex-col items-center gap-3 rounded-[1.5rem] bg-pink-50 px-6 py-12 text-center">
                <BookHeart className="h-9 w-9 text-pink-500" />
                <p className="text-base font-semibold text-ink">{t('wishSentTitle')}</p>
                <p className="max-w-xs text-sm leading-6 text-ink-muted">{t('wishSentBody')}</p>
            </div>
        );
    }

    return (
        <form onSubmit={composer.submit} className="mt-8 space-y-6">
            {/* Message */}
            <textarea
                id="wishbook-message"
                maxLength={maxMessageLength}
                rows={8}
                value={composer.message}
                onChange={composer.changeMessage}
                disabled={composer.isSending}
                aria-label={t('messageAriaLabel')}
                placeholder={t('currentPlaceholder')}
                className="min-h-56 w-full resize-none rounded-[1.5rem] border border-border/70 bg-background px-5 py-4 text-base leading-8 text-ink transition-shadow outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
            />

            {/* Recording */}
            <div className="px-1">
                <VoiceRecorder recorder={composer.recorder} disabled={composer.isSending} />
            </div>

            {/* Send: a line above it keeps it apart from the recording */}
            <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-5">
                <span className="text-xs text-ink-faint">{t('charactersLeft', { current: composer.message.length, max: maxMessageLength })}</span>
                <button
                    type="submit"
                    disabled={!composer.canSend}
                    className="inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold text-white bg-gradient-brand disabled:opacity-40"
                >
                    {composer.isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {t('addToWishbook')}
                </button>
            </div>
            {composer.sendError && <p className="text-xs text-rose-600">{toErrorMessage(composer.sendError)}</p>}
        </form>
    );
}
