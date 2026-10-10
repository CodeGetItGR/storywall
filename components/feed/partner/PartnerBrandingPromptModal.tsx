'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Modal } from '@/components/ui/modal';
import { usePartnerBrandingPrompt } from '@/hooks/usePartnerBrandingPrompt';
import type { PartnerBrandingNoticeDto } from '@/lib/api/types';

// Asks the host whether the partner linked to their event may be shown in its feed.
export function PartnerBrandingPromptModal({ eventId, prompt }: { eventId: string; prompt: PartnerBrandingNoticeDto | null }) {
    const t = useTranslations('PartnerBrandingPrompt');
    const { open, accept, decline, dismiss, pendingChoice, error } = usePartnerBrandingPrompt(eventId, prompt);

    if (!prompt) return null;
    const partner = prompt.displayName;
    const answering = pendingChoice !== null;

    return (
        <Modal open={open} onClose={dismiss} size="sm" closeLabel={t('close')}>
            <Modal.Body className="px-4 pt-12 pb-4 sm:px-5">
                {/* Notice */}
                <h2 className="pr-8 text-base font-semibold text-ink">{t('title', { partner })}</h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{t('body', { partner })}</p>
                {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

                {/* Actions */}
                <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
                    <button
                        type="button"
                        onClick={decline}
                        disabled={answering}
                        className="inline-flex min-h-11 items-center gap-2 rounded-full bg-surface-muted px-4 text-sm font-medium text-ink-muted transition-colors hover:text-ink disabled:opacity-60"
                    >
                        {pendingChoice === 'decline' && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                        {t('decline')}
                    </button>
                    <button
                        type="button"
                        onClick={accept}
                        disabled={answering}
                        className="inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-white transition-colors hover:bg-ink/90 disabled:opacity-60"
                    >
                        {pendingChoice === 'accept' && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                        {t('accept')}
                    </button>
                </div>
            </Modal.Body>
        </Modal>
    );
}
