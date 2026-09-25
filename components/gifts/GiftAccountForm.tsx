'use client';

import { Loader2, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { EventGiftAccountResponseDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

const inputClassName = 'mt-1.5 w-full rounded-xl bg-surface-muted px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30';

interface GiftAccountFormProps {
    account?: EventGiftAccountResponseDto | null;
    onSubmitAction: (event: React.SubmitEvent<HTMLFormElement>) => void;
    isSaving: boolean;
    invalidIban: boolean;
    onCancelAction?: () => void;
    onRemoveAction?: () => void;
    className?: string;
}

export function GiftAccountForm({ account, onSubmitAction, isSaving, invalidIban, onCancelAction, onRemoveAction, className }: GiftAccountFormProps) {
    const t = useTranslations('GiftsPage');

    return (
        <form onSubmit={onSubmitAction} className={cn('space-y-4', className)}>
            {/* Fields */}
            <label className="block text-sm font-semibold text-ink">
                {t('fields.iban')}
                <input name="iban" required maxLength={42} defaultValue={account?.iban ?? ''} className={cn(inputClassName, 'font-mono uppercase')} />
                {invalidIban && <span className="mt-1 block text-xs text-rose-600">{t('invalidIban')}</span>}
            </label>
            <label className="block text-sm font-semibold text-ink">
                {t('fields.accountHolder')}
                <input name="accountHolder" required maxLength={140} defaultValue={account?.accountHolder ?? ''} className={inputClassName} />
            </label>
            <label className="block text-sm font-semibold text-ink">
                {t('fields.bankName')}
                <input name="bankName" required maxLength={140} defaultValue={account?.bankName ?? ''} className={inputClassName} />
            </label>
            <label className="block text-sm font-semibold text-ink">
                {t('fields.note')}
                <textarea name="note" maxLength={500} rows={3} defaultValue={account?.note ?? ''} className={cn(inputClassName, 'resize-none')} />
            </label>

            {/* Actions */}
            <div className="flex items-center justify-between gap-3">
                <div>
                    {onRemoveAction && (
                        <button
                            type="button"
                            onClick={onRemoveAction}
                            className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                        >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                            {t('remove')}
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {onCancelAction && (
                        <button
                            type="button"
                            onClick={onCancelAction}
                            className="inline-flex min-h-10 items-center rounded-full px-4 text-sm font-semibold text-ink-muted hover:bg-surface-muted hover:text-ink"
                        >
                            {t('cancel')}
                        </button>
                    )}
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="inline-flex min-h-10 items-center gap-2 rounded-full px-5 text-sm font-semibold text-white bg-gradient-brand disabled:opacity-50"
                    >
                        {isSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                        {t('save')}
                    </button>
                </div>
            </div>
        </form>
    );
}
