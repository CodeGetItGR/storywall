'use client';

import { useTranslations } from 'next-intl';

import { INVITATION_FONT_CLASSES } from '@/components/saveMyDate/invitation/invitationFonts';
import { FONT_PAIRING_SAMPLE } from '@/lib/adminFontPairings';
import { cn } from '@/lib/utils';

// The pairing's three fonts on a sample invitation: the editor's own fonts come from the font classes,
// uploaded ones from their @font-face rules.
export function FontPairingPreview({
    titleFont,
    bodyFont,
    buttonFont,
    fontFaceCss,
}: {
    titleFont: string;
    bodyFont: string;
    buttonFont: string;
    fontFaceCss: string;
}) {
    const t = useTranslations('AdminPage.themeFonts.drawer');

    return (
        <section aria-label={t('preview')} className="space-y-2">
            {fontFaceCss && <style>{fontFaceCss}</style>}
            <p className="text-[11px] font-bold tracking-wide text-ink-muted uppercase">{t('preview')}</p>
            <div data-testid="font-pairing-sample" className={cn('space-y-3 rounded-lg border border-border bg-white p-5 text-center text-ink', INVITATION_FONT_CLASSES)}>
                <p className="text-[30px] leading-tight" style={{ fontFamily: titleFont }}>
                    {FONT_PAIRING_SAMPLE.title}
                </p>
                <p className="text-base leading-snug" style={{ fontFamily: bodyFont }}>
                    {FONT_PAIRING_SAMPLE.body}
                </p>
                <span className="inline-block rounded-full bg-ink px-4 py-1.5 text-sm text-white" style={{ fontFamily: buttonFont }}>
                    {FONT_PAIRING_SAMPLE.button}
                </span>
            </div>
        </section>
    );
}
