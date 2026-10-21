'use client';

import { Handshake } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { BecomePartnerSheet } from '@/components/vendors/BecomePartnerSheet';
import { useBecomePartner } from '@/hooks/useBecomePartner';

// The card disappears on its own after a dismissal: useDismissPartnerPrompt refreshes vendors/me.
export function PartnerPromptCard() {
    const t = useTranslations('Vendors');
    const partner = useBecomePartner();

    return (
        <section className="rounded-2xl bg-surface-muted p-4">
            {/* Prompt */}
            <div className="flex items-start gap-3">
                <Handshake className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                <div>
                    <h2 className="text-sm font-semibold text-ink">{t('partner.promptTitle')}</h2>
                    <p className="mt-1 text-sm text-ink-muted">{t('partner.promptBody')}</p>
                </div>
            </div>

            {/* Actions */}
            <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" size="lg" onClick={partner.openSheet}>
                    {t('partner.promptApply')}
                </Button>
                <Button type="button" variant="ghost" size="lg" onClick={partner.dismiss} disabled={partner.isDismissing}>
                    {t('partner.promptDismiss')}
                </Button>
            </div>

            {/* Sheet */}
            <BecomePartnerSheet open={partner.sheetOpen} defaults={partner.defaults} search={partner.search} onCloseAction={partner.closeSheet} />
        </section>
    );
}
